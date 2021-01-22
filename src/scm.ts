import { RiskCategory, Risk, SCMFacts, MaybeString } from './types';
import { calculateRiskSubtotal, whereis, runCmd } from './helpers';
import { getConfig } from './config';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function gatherLocalSCMRisk(): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 5;

  const config = getConfig();

  const facts = await gatherFacts();

  // perform appropriate checks
  checks.push(gitRepoDirCheck(config.flags.dir));

  if (facts.scm.gitPath) {
    checks.push(gitConfigGPGCheck());
  }
  if (facts.scm.gitPath && facts.scm.gpgPath) {
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
