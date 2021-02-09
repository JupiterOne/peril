import { RiskCategory, Risk, SCMFacts, MaybeString, Config, GitleaksMetrics } from './types';
import { calculateRiskSubtotal, whereis, runCmd, formatRisk, findFiles } from './helpers';
import { getConfig } from './config';
import * as fs from 'fs-extra';
import * as path from 'path';

const riskCategory = 'scm';

export async function gatherLocalSCMRisk(): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 5;

  const config = getConfig();

  // perform appropriate checks
  checks.push(gitRepoDirCheck(config.flags.dir, config));

  if (config.facts.scm.gitPath) {
    checks.push(gitConfigGPGCheck());
  }
  if (config.facts.scm.gitPath && config.facts.scm.gpgPath) {
    checks.push(gpgVerifyRecentCommitsCheck());
  }

  checks.push(gitleaksCheck(await parseGitleaksScan(config.facts.scm.scans.gitleaksScanReport)));

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'SCM Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function gitRepoDirCheck(dir: string, config: Config = getConfig()): Promise<Risk> {
  const check = 'git';
  const recommendations: string[] = [];
  const missingValue = config.values.checks.scm.git.missingValue;
  let value = missingValue;
  let description = 'Missing - no repo found!';

  if (await fs.pathExists(path.join(dir, '.git'))) {
    value = -5;
    description = 'Repo found. 🎉';
  } else {
    recommendations.push('Version code in a Git repository.');
  }

  return formatRisk({
    check,
    value,
    description,
    recommendations
  }, riskCategory, check);
}

export async function gitConfigGPGCheck(cmdRunner: any = undefined, config: Config = getConfig()): Promise<Risk> {
  const check = 'enforceGpg';
  const recommendations: string[] = [];
  const missingValue = config.values.checks.scm.enforceGpg.missingValue;
  let value = missingValue;
  let description = 'commit.gpgsign NOT set to true.';

  const cmd = await runCmd('git config --get commit.gpgsign', cmdRunner);

  if (!cmd.failed && cmd.stdout.includes('true')) {
    value = -1;
    description = 'commit.gpgsign enabled. 🎉'
  } else {
    recommendations.push('Set commit.gpgsign to true for this repo.');
  }

  return formatRisk({
    check,
    value,
    description,
    recommendations
  }, riskCategory, check);
}

export async function gpgVerifyRecentCommitsCheck(cmdRunner: any = undefined, config: Config = getConfig()): Promise<Risk> {
  const check = 'verifyGpg';
  const recommendations: string[] = [];
  const missingValue = config.values.checks.scm.verifyGpg.missingValue;
  let value = missingValue;
  let description = 'No recent signed commits found.';

  const validHeadSha = await gpgVerifyCommit('HEAD', cmdRunner);
  const validPrevSha = await gpgVerifyCommit('HEAD~1', cmdRunner);

  if (validHeadSha || validPrevSha) {
    value = -1;
    description = 'One or more recent signed commits found. 🎉'
  } else {
    recommendations.push('Sign your commits with a verified GPG key.');
  }

  return formatRisk({
    check,
    value,
    description,
    recommendations
  }, riskCategory, check);
}

export async function gpgVerifyCommit(gitref: string, cmdRunner: any = undefined): Promise<boolean> {
  const cmd = await runCmd('git verify-commit --raw ' + gitref, cmdRunner);
  return !cmd.failed && !!/VALIDSIG/.exec(cmd.stderr); // git puts this on stderr for some reason
}

export async function gatherFacts(cmdRunner: any = undefined, config: Config = getConfig()): Promise<SCMFacts> {
  const { remote, remoteUrl } = await getRemote(cmdRunner);
  const gitleaksScanReportPattern = 'credscan-report.sarif';
  const gitleaksScanReportDir = path.join(config.flags.dir, 'reports');

  return {
    scm: {
      branch: await getBranch(cmdRunner),
      remote,
      remoteUrl,
      gitPath: whereis('git'),
      gpgPath: whereis('gpg'),
      scans: {
        gitleaksScanReport: (await findFiles(gitleaksScanReportDir, gitleaksScanReportPattern))[0]
      }
    }
  };
}

export async function getBranch(cmdRunner: any = undefined): Promise<MaybeString> {
  const cmd = await runCmd('git symbolic-ref --short HEAD', cmdRunner);
  if (cmd.failed) {
    return undefined;
  }
  return cmd.stdout;
}

export async function getRemote(cmdRunner: any = undefined): Promise<{remote: MaybeString, remoteUrl: MaybeString}> {
  const { stdout: remoteUrl, failed } = await runCmd('git config --get remote.origin.url', cmdRunner);
  if (failed) {
    return { remote: undefined, remoteUrl: undefined };
  }

  return {
    remoteUrl,
    remote: ['github', 'bitbucket'].find(origin => remoteUrl.indexOf(origin) > 0),
  };
}

export async function gitleaksCheck(leakMetrics: GitleaksMetrics, config: Config = getConfig()): Promise<Risk> {
  const check = 'gitleaksFindings';
  const recommendations: string[] = [];
  const perFindingValue = config.values.checks.scm.gitleaksFindings.perFindingValue;

  const scalingValueBySeverity: GitleaksMetrics = {
    critical: 1,
    high: 0.75,
    medium: 0.5,
    low: 0.25
  };

  const value = [ 'critical', 'high', 'medium', 'low' ].reduce((acc, sev) => {
    acc += leakMetrics[sev] * perFindingValue * scalingValueBySeverity[sev];
    return acc;
  }, 0);

  // summarize valid findings in description
  // e.g. 1 CRITICAL, 2 HIGH, etc.
  const validFindingCounts: string[] = [];
  for (const sevKey of Object.keys(leakMetrics)) {
    if (sevKey === 'total') {
      continue;
    }
    if (leakMetrics[sevKey] > 0) {
        validFindingCounts.push(`${leakMetrics[sevKey]} ${sevKey.toUpperCase()}`);
    }
  }
  if (!validFindingCounts.length) {
    validFindingCounts.push('None');
  } else {
    recommendations.push('Revoke/invalidate any leaked secrets, then permanently remove them from this Git history with the BFG tool. (See https://rtyley.github.io/bfg-repo-cleaner/)');
  }

  return formatRisk({
    check,
    description: validFindingCounts.join(', '),
    value,
    recommendations
  }, riskCategory, check);
}

export async function parseGitleaksScan(reportFile: MaybeString, readFile: typeof fs.readFile = fs.readFile): Promise<GitleaksMetrics> {
  let metrics: GitleaksMetrics;
  try {
    const report = JSON.parse(await readFile(String(reportFile), 'utf8'));
    metrics = report.runs[0].properties.metrics;
  } catch (e) {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
  }
  return metrics;
}
