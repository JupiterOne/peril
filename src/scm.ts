import { RiskCategory, Risk, SCMFacts, MaybeString, Config } from './types';
import { calculateRiskSubtotal, whereis, runCmd, formatRisk } from './helpers';
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
  const missingValue = config.values.checks.scm.git.missingValue;
  let value = missingValue;
  let description = 'Missing - no repo found!';

  if (await fs.pathExists(path.join(dir, '.git'))) {
    value = -5;
    description = 'Repo found.';
  }

  return formatRisk({
    check,
    value,
    description
  }, riskCategory, check);
}

export async function gitConfigGPGCheck(cmdRunner: any = undefined, config: Config = getConfig()): Promise<Risk> {
  const check = 'enforceGpg';
  const missingValue = config.values.checks.scm.enforceGpg.missingValue;
  let value = missingValue;
  let description = 'commit.gpgsign NOT set to true.';

  const cmd = await runCmd('git config --get commit.gpgsign', cmdRunner);

  if (!cmd.failed && cmd.stdout.includes('true')) {
    value = -1;
    description = 'commit.gpgsign enabled.'
  }

  return formatRisk({
    check,
    value,
    description
  }, riskCategory, check);
}

export async function gpgVerifyRecentCommitsCheck(cmdRunner: any = undefined, config: Config = getConfig()): Promise<Risk> {
  const check = 'verifyGpg';
  const missingValue = config.values.checks.scm.verifyGpg.missingValue;
  let value = missingValue;
  let description = 'No recent signed commits found.';

  const validHeadSha = await gpgVerifyCommit('HEAD', cmdRunner);
  const validPrevSha = await gpgVerifyCommit('HEAD~1', cmdRunner);

  if (validHeadSha || validPrevSha) {
    value = -1;
    description = 'One or more recent signed commits found.'
  }

  return formatRisk({
    check,
    value,
    description
  }, riskCategory, check);
}

export async function gpgVerifyCommit(gitref: string, cmdRunner: any = undefined): Promise<boolean> {
  const cmd = await runCmd('git verify-commit --raw ' + gitref, cmdRunner);
  return !cmd.failed && !!/VALIDSIG/.exec(cmd.stderr); // git puts this on stderr for some reason
}

export async function gatherFacts(cmdRunner: any = undefined): Promise<SCMFacts> {
  const { remote, remoteUrl } = await getRemote(cmdRunner);
  return {
    scm: {
      branch: await getBranch(cmdRunner),
      remote,
      remoteUrl,
      gitPath: whereis('git'),
      gpgPath: whereis('gpg')
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
