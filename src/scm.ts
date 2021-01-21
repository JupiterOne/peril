import { RiskCategory, Risk } from './types';
import { calculateRiskSubtotal, whereis, runCmd } from './helpers';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function gatherLocalSCMRisk(dir: string = process.cwd()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 5;

  const git = whereis('git');
  const gpg = whereis('gpg');

  checks.push(gitRepoDirCheck(dir));

  if (git) {
    checks.push(gitConfigGPGCheck());
  }
  if (git && gpg) {
    checks.push(gpgVerifyRecentCommitsCheck());
  }

  const risks = await Promise.all(checks);

  return {
    title: 'SCM Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function gitRepoDirCheck(dir: string): Promise<Risk> {
  let value = 5;
  let description = 'Missing SCM - no git repo found!';

  if (await fs.pathExists(path.join(dir, '.git'))) {
    value = -5;
    description = 'SCM - git repo found.';
  }

  return {
    source: 'scm.git',
    value,
    description
  };
}

export async function gitConfigGPGCheck(cmdRunner: any = undefined): Promise<Risk> {
  let value = 0.5;
  let description = 'SCM - commit.gpgsign NOT set to true.';

  const cmd = await runCmd('git config --get commit.gpgsign', cmdRunner);

  if (!cmd.failed && cmd.stdout.includes('true')) {
    value = -1;
    description = 'SCM - commit.gpgsign enabled.'
  }

  return {
    source: 'scm.enforce.gpg',
    value,
    description
  };
}

export async function gpgVerifyRecentCommitsCheck(cmdRunner: any = undefined): Promise<Risk> {
  let value = 0.5;
  let description = 'SCM - NO recent signed commits found.';

  const validHeadSha = await gpgVerifyCommit('HEAD', cmdRunner);
  const validPrevSha = await gpgVerifyCommit('HEAD~1', cmdRunner);

  if (validHeadSha || validPrevSha) {
    value = -1;
    description = 'SCM - one or more recent signed commits found.'
  }

  return {
    source: 'scm.enforce.gpg',
    value,
    description
  };
}

export async function gpgVerifyCommit(gitref: string, cmdRunner: any = undefined): Promise<boolean> {
  const cmd = await runCmd('git verify-commit --raw ' + gitref, cmdRunner);
  return !cmd.failed && !!/VALIDSIG/.exec(cmd.stderr); // git puts this on stderr for some reason
}

gatherLocalSCMRisk().then(console.log).catch(console.error);
