import { getConfig, initConfig } from './config';
import { runCmd } from './helpers';
import { Config } from './types';

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

export async function getGPGIdentity(config: Config = getConfig(), cmdRunner: any = undefined): Promise<string> {
  const { gpgPath } = config.facts.scm;
  if (!gpgPath) {
    return '';
  }
  let identity: string;
  try {
    const secretKeys = (await runCmd(gpgPath + ' --list-secret-keys --with-colons', cmdRunner)).stdout.split('\n');
    const uidLine = secretKeys.filter(k => /^uid:/.exec(k)).pop();
    // uidLine is of form:
    // uid:u::::1412160812::4A19E3CAE9B6FFD6D81EAC012D1110A19E074749::Some User <some.user@company.com>::::::::::0:
    identity = ((uidLine || '').split(':')[9]) || '';
  } catch (e) {
    return '';
  }
  return identity;
}
