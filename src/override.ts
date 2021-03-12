import { runCmd } from './helpers';
import { getConfig } from './config';
import { Override, Config, OverrideFacts, RiskCategory, Risk } from './types';
import * as fs from 'fs-extra';
import { log, findFiles, isWorldWritable } from './helpers';
import path from 'path';

/*

  accept --pubkeyDir
  for each file in pubkeyDir, attempt:
  gpg --no-default-keyring --keyring ./somekeyring.gpg --import ./pubkeyDir/$FILE

gpg: keybox './somekeyring.gpg' created
gpg: key E73869E02AE60C1E: public key "Erich Smith <erich.smith@jupiterone.com>" imported
gpg: Total number processed: 1
gpg:               imported: 1

  Then, for each .asc file in .peril/, do
gpg --no-default-keyring --keyring ./somekeyring.gpg --verify .override.asc
gpg: Signature made Mon Feb 22 21:59:40 2021 EST
gpg:                using RSA key 628AD0CFB783B10FE198CF61E73869E02AE60C1E
gpg: Good signature from "Erich Smith <erich.smith@jupiterone.com>" [ultimate]

 If valid, strip line 1, then cat until -----BEGIN PGP SIGNATURE-----: this is JSON body
 parse JSON body
 apply
*/

const Authorized_Keyring = './authorized_pubkeys.gpg';

export async function gatherFacts(config: Config = getConfig()): Promise<OverrideFacts> {
  const repoOverridesPattern = '.*override-until_.*.asc$';
  const repoOverridesDir = path.join(config.flags.dir, '.peril');

  const pubKeysDir = config.flags.pubkeyDir;
  const pubKeyPattern = '.*.gpg$';
  const availablePubKeys = await findFiles(String(pubKeysDir), pubKeyPattern);

  return {
    override: {
        trustedPubKeysDir: pubKeysDir,
        trustedPubKeys: await validatePubKeys(availablePubKeys),
        repoOverrides: await findFiles(String(repoOverridesDir), repoOverridesPattern)
    }
  };
}

export async function validateOverride(override: Override, now: Date = new Date(), cmdRunner: any = undefined): Promise<boolean> {
  const then = new Date(override.exp);
  if (now > then) {
    log(`Ignoring expired override credit of ${override.credit}, expiry ${override.expires}.`, 'DEBUG');
    return false;
  }
  // does the rootSHA match this repo?
  const rootSHA = await getRootSHA(cmdRunner);
  if (rootSHA !== override.rootSHA) {
    log(`Ignoring copy/paste override credit of ${override.credit}, signer ${override.signedBy}.`, 'DEBUG');
    return false;
  }

  return true;
}

export async function verifyOverrideSignature(file: string, cmdRunner: any = undefined): Promise<boolean> {
  const cmd = await runCmd(`gpg --no-default-keyring --keyring ${Authorized_Keyring} --verify ${file}`, cmdRunner);
  if (cmd.failed) {
    return false;
  }
  // gpg puts this on stderr for some reason...
  return !!/Good signature/.exec(cmd.stderr);
}

export async function parseOverride(file: string): Promise<Override> {
  let payload;
  try {
    const data = await fs.readFile(file, 'utf8');
    // marshal data between JSON object start/end delimiters
    // i.e. ignore all GPG clearsign padding
    payload = '{' + data.split('{')[1].split('}')[0] + '}';
  } catch (err) {
    log(`Error parsing ${file}: ${err}`, 'WARN');
    return {} as Override;
  }

  return JSON.parse(payload) as Override;
}

export async function validatePubKeys(keys: string[]): Promise<string[]> {
  const validPubKeys: string[] = [];
  const key = keys[0];
  if (!key) {
    return [];
  }

  for (const key of keys) {
    try {
      const { mode: dirMode } = await fs.stat(path.dirname(key));
      const { mode: keyMode } = await fs.stat(key);
      if (!isWorldWritable(dirMode) && !isWorldWritable(keyMode)) {
        validPubKeys.push(key);
      } else {
        log(`Pubkey ${key} is world writabile and cannot be trusted! Skipping...`);
      }
    } catch (err) {
      log('Error accessing pubkey file or directory: ' + err);
      return [];
    }
  }

  return validPubKeys;
}

export async function importPublicKeys(keys: string[], cmdRunner: any = undefined): Promise<void> {
  for (const key of keys) {
    const cmd = await runCmd(`gpg --no-default-keyring --keyring ${Authorized_Keyring} --import ${key}`, cmdRunner);
    if (cmd.failed) {
      log('Error importing GPG key: ' + cmd.stderr, 'ERROR');
    }
  }
  // TODO: ensure cleanup of Authorized_Keyring file
}

export async function createOverride(credit: number, expiry: number, justification: string, cmdRunner: any = undefined): Promise<Override> {
  return {
    exp: expiry,
    expires: (new Date(expiry)).toString(),
    signedBy: await getGPGIdentity(cmdRunner),
    rootSHA: await getRootSHA(cmdRunner),
    justification,
    credit
  };
}

/*
  Obtain the root (initial) commit SHA for this repo, to strongly associate
  an override payload with the current git repository.
*/
export async function getRootSHA(cmdRunner: any = undefined): Promise<string> {
  const res = await runCmd('git rev-list --max-parents=0 HEAD', cmdRunner);
  return res.stdout;
}

export async function getGPGIdentity(cmdRunner: any = undefined): Promise<string> {
  let identity: string;
  try {
    const gpgKeys = await runCmd('gpg --list-secret-keys --with-colons', cmdRunner);
    const secretKeys = gpgKeys.stdout.split('\n');
    const uidLine = secretKeys.filter(k => /^uid:/.exec(k)).pop();
    // uidLine is of form:
    // uid:u::::1412160812::4A19E3CAE9B6FFD6D81EAC012D1110A19E074749::Some User <some.user@company.com>::::::::::0:
    identity = ((uidLine || '').split(':')[9]) || '';
  } catch (e) {
    return '';
  }
  return identity;
}

export async function clearsign(data: any, cmdRunner: any = undefined): Promise<String> {
  const res = await runCmd('gpg --clearsign', cmdRunner, { input: JSON.stringify(data, null, 2) });
  return res.stdout || '';
}
/*
export async function () {
  const keys = [
    '/Users/erichs/repos/jupiterone/peril/gpgkeys/erichs.gpg'
  ];
  const o = '/Users/erichs/repos/jupiterone/peril/.peril/override-until_2021-03-13T00:58:47.392Z.asc';
  // const o = '/Users/erichs/repos/jupiterone/peril/.peril/override-until_2021-03-12T00:58:47.392Z.asc';

  await importPublicKeys(keys);
  const override = await parseOverride(o);
  const isValid = await validateOverride(override);
  if (!isValid) {
    throw new Error('invalid Risk override');
  }
  return override;
}

export async function gatherRiskOverrides(config: Config = getConfig()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 0;

  const j1Client = config.facts.j1.client;
  if (j1Client) {
    const projectName = config.facts.project.name;
    const findings = await j1Client.gatherEntities(`Find Finding that HAS CodeRepo with name='${projectName}'`);
    const { snykFindings, maintenanceFindings, unknownFindings } = sortFindings(findings as any[]);
    checks.push(codeRepoSnykFindingsCheck(snykFindings));
    checks.push(codeRepoMaintenanceFindingsCheck(maintenanceFindings));
    if (unknownFindings.length) {
      log(`WARNING: ${projectName} CodeRepo has ${unknownFindings.length} Findings of unknown type. These do not currently contribute to risk scoring, but should be addressed.`, 'WARN');
    }
  }
  checks.push(threatModelCheck());

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'PROJECT Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}
*/
