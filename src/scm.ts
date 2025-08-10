import * as fs from 'fs-extra';
import * as path from 'path';
import { getConfig } from './config';
import { findFiles, formatRisk, runCmd, whereis } from './helpers';
import {
  Config,
  GitleaksMetrics,
  MaybeString,
  Risk,
  SCMFacts,
  SCMValuesEnforceGPGCheck,
  SCMValuesGitCheck,
  SCMValuesGitleaksFindingsCheck,
  SCMValuesVerifyAllGPGCheck,
  SCMValuesVerifyGPGCheck,
} from './types';

const riskCategory = 'scm';

export async function gitRepoDirCheck(
  dir: string,
  checkValues: SCMValuesGitCheck
): Promise<Risk> {
  const check = 'git';
  const recommendations: string[] = [];
  let value = checkValues.missingValue;
  let description = 'Missing - no repo found!';

  if (await fs.pathExists(path.join(dir, '.git'))) {
    value = -1;
    description = 'Repo found. 🎉';
  } else {
    recommendations.push('Version code in a Git repository.');
  }

  return formatRisk(
    {
      check,
      value,
      description,
      recommendations,
    },
    riskCategory,
    check
  );
}

// TODO: remove this, or replace with a GitHub-aware check
// This doesn't work in CI/CD environments, and is not a good proxy for
// whether the repo is actually enforcing GPG signing.
export async function gitConfigGPGCheck(
  checkValues: SCMValuesEnforceGPGCheck,
  cmdRunner: any = undefined
): Promise<Risk> {
  const check = 'enforceGpg';
  const recommendations: string[] = [];
  const missingValue = checkValues.missingValue;
  let value = missingValue;
  let description = 'commit.gpgsign NOT set to true.';

  const cmd = await runCmd('git config --get commit.gpgsign', cmdRunner);

  if (!cmd.failed && cmd.stdout.includes('true')) {
    value = -1;
    description = 'commit.gpgsign enabled. 🎉';
  } else {
    recommendations.push('Set commit.gpgsign to true for this repo.');
  }

  return formatRisk(
    {
      check,
      value,
      description,
      recommendations,
    },
    riskCategory,
    check
  );
}

// This is a best-effort verification of the top two commits (accounts for merge
// commits), and is proxy indicator that the PR is likely using signed
// commits. Does not unduly penalize for individual unsigned commits, but does
// reward in the presence of at least one recently signed commit.
export async function gpgVerifyRecentCommitsCheck(
  checkValues: SCMValuesVerifyGPGCheck,
  cmdRunner: any = undefined
): Promise<Risk> {
  const check = 'verifyGpg';
  const recommendations: string[] = [];
  const missingValue = checkValues.missingValue;
  let value = missingValue;
  let description = 'No recent signed commits found.';

  const validHeadSha = await gpgVerifyCommit('HEAD', cmdRunner);
  const validPrevSha = await gpgVerifyCommit('HEAD~1', cmdRunner);

  if (validHeadSha || validPrevSha) {
    value = -1;
    description = 'One or more recent signed commits found. 🎉';
  } else {
    recommendations.push('Sign your commits with a verified GPG key.');
  }

  return formatRisk(
    {
      check,
      value,
      description,
      recommendations,
    },
    riskCategory,
    check
  );
}

// This is a thorough verification of signed commits for all commits in the PR.
// It will add risk for each unsigned, signed-but-expired, or signed-but-revoked
// commit.
export async function gpgVerifyAllCommitsCheck(
  mergeRef: string,
  checkValues: SCMValuesVerifyAllGPGCheck,
  cmdRunner: any = undefined
): Promise<Risk> {
  console.error({ mergeRef, checkValues });
  const check = 'verifyGpgSigningAllCommits';
  const recommendations: string[] = [];
  const perUnverifiedValue = checkValues.perUnverifiedValue;

  const validityLog = await gpgVerifyAllCommits(
    `HEAD...${mergeRef}`,
    cmdRunner
  );
  console.error({ validityLog });
  // produces lines like:
  // "G 3b8d0 John Doe  commit message"    # good signature
  // "N 771cd John Doe  commit message"    # no signature
  // "X ac731 John Smith  commit message"  # good signature that has expired
  // "Y dead0 Jane Smith  commit message"  # good signature, key expired
  // "R a001c John Doe  commit message"    # good signature, key revoked
  // "U b10cc Jane Doe  commit message"    # good signature, key unknown
  // "E 21a1c John Doe  commit message"    # signature cannot be checked, missing key

  let description = `All commits in ${mergeRef} are signed.`;
  let value = -1;

  const unsignedCommits = validityLog
    .split('\n')
    .map((l) => l.split(' '))
    .filter((e) => ['N', 'X', 'Y', 'R'].includes(e[0]));

  if (unsignedCommits.length > 0) {
    description = `Found ${unsignedCommits.length} unsigned commits since ${mergeRef}.`;
    // add risk for each unsigned commit
    value = perUnverifiedValue * unsignedCommits.length;
    for (const splitLog of unsignedCommits) {
      recommendations.push(
        `Commit '${splitLog.join(
          ' '
        )}' is unsigned or has an invalid signature.`
      );
    }
    recommendations.push(
      `Sign your commits with a verified GPG key. See https://git-scm.com/docs/pretty-formats#Documentation/pretty-formats.txt-emGem for more details on the concise git log '%G?' output.`
    );
  }

  return formatRisk(
    {
      check,
      value,
      description,
      recommendations,
    },
    riskCategory,
    check
  );
}
export async function gpgVerifyCommit(
  gitref: string,
  cmdRunner: any = undefined
): Promise<boolean> {
  const cmd = await runCmd('git verify-commit --raw ' + gitref, cmdRunner);
  return Boolean(/NEWSIG/.exec(cmd.stderr)); // git puts this on stderr for some reason
}

export async function gpgVerifyAllCommits(
  gitref: string,
  cmdRunner: any = undefined
): Promise<string> {
  // per https://git-scm.com/docs/pretty-formats#Documentation/pretty-formats.txt-emGem,
  // produces lines like:
  // "G 3b8d0 John Doe  commit message"    # good signature
  // "X ac731 John Smith commit message"   # good signature that has expired
  // "Y dead0 Jane Smith  commit message"  # good signature, key expired
  // "R a001c John Doe  commit message"    # good signature, key revoked
  // "U b10cc Jane Doe  commit message"    # good signature, key unknown
  // "E 21a1c John Doe  commit message"    # signature cannot be checked, missing key
  // "N 771cd John Doe  commit message"    # no signature
  //
  // NOTE: All values in the first column of log output, other than 'N'
  // rely on local GPG keys, so it is the users' responsibility to ensure
  // that their local GPG keys are up to date and trusted if they want to
  // rely on these values, prior to executing Peril.

  const cmd = await runCmd(
    `git log --pretty="format:%G? %h %aN %s" ${gitref} 2>&1`,
    cmdRunner,
    { shell: true }
  );
  return cmd.stdout;
}

export async function gatherFacts(
  cmdRunner: any = undefined,
  config: Config = getConfig()
): Promise<SCMFacts> {
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
        gitleaksScanReport: (
          await findFiles(gitleaksScanReportDir, gitleaksScanReportPattern)
        )[0],
      },
    },
  };
}

export async function getBranch(
  cmdRunner: any = undefined
): Promise<MaybeString> {
  const cmd = await runCmd('git symbolic-ref --short HEAD', cmdRunner);
  if (cmd.failed) {
    return undefined;
  }
  return cmd.stdout;
}

export async function getRemote(
  cmdRunner: any = undefined
): Promise<{ remote: MaybeString; remoteUrl: MaybeString }> {
  const { stdout: remoteUrl, failed } = await runCmd(
    'git config --get remote.origin.url',
    cmdRunner
  );
  if (failed) {
    return { remote: undefined, remoteUrl: undefined };
  }

  return {
    remoteUrl,
    remote: ['github', 'bitbucket'].find(
      (origin) => remoteUrl.indexOf(origin) > 0
    ),
  };
}

export async function gitleaksCheck(
  leakMetrics: GitleaksMetrics,
  checkValues: SCMValuesGitleaksFindingsCheck
): Promise<Risk> {
  const check = 'gitleaksFindings';
  const recommendations: string[] = [];
  const perFindingValue = checkValues.perFindingValue;

  const scalingValueBySeverity: GitleaksMetrics = {
    critical: 1,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
  };

  const value = ['critical', 'high', 'medium', 'low'].reduce((acc, sev) => {
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
    recommendations.push(
      'Revoke/invalidate any leaked secrets, then permanently remove them from this Git history with the BFG tool. (See https://rtyley.github.io/bfg-repo-cleaner/)'
    );
  }

  return formatRisk(
    {
      check,
      description: validFindingCounts.join(', '),
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function parseGitleaksScan(
  reportFile: MaybeString,
  readFile: typeof fs.readFile = fs.readFile
): Promise<GitleaksMetrics> {
  let metrics: GitleaksMetrics;
  try {
    const report = JSON.parse(await readFile(String(reportFile), 'utf8'));
    metrics = report.runs[0].properties.metrics;
  } catch (e) {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
  }
  return metrics;
}
