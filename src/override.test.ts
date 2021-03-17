import * as fs from 'fs-extra';
import { cloneDeep } from 'lodash';
import path from 'path';
import { config } from '../test/fixtures/testConfig';
import { testOverride } from '../test/fixtures/testOverride';
import { getLogOutput } from './helpers';
import {
  clearsign,
  createOverride,
  gatherFacts,
  getGPGIdentity,
  getRootSHA,
  importPublicKeys,
  parseOverride,
  removePublicKeyring,
  validateOverride,
  validatePubKeys,
  verifyOverrideSignature,
} from './override';
import { Override } from './types';

describe('override features', () => {
  const gpgIdRaw =
    'uid:u::::14122::41ECEBA211::Some User <some.user@company.com>::::::::::0:';
  const gpgId = 'Some User <some.user@company.com>';

  it('getGPGIdentity parses gpg secret keys list output for identity', async () => {
    const mockRunCmd = jest.fn();
    const id = await getGPGIdentity(
      mockRunCmd.mockResolvedValueOnce({ stdout: gpgIdRaw })
    );
    expect(id).toEqual(gpgId);
  });

  it('getGPGIdentity returns empty string when gpg is not available', async () => {
    const konfig = cloneDeep(config);
    konfig.facts.scm.gpgPath = undefined;
    const id = await getGPGIdentity(konfig);
    expect(id).toEqual('');
  });

  it('getGPGIdentity returns empty string when gpg fails to execute properly', async () => {
    const mockRunCmd = jest.fn().mockRejectedValue(new Error('ENOENT'));
    const id = await getGPGIdentity(mockRunCmd);
    expect(id).toEqual('');
  });

  it('getGPGIdentity returns empty string when gpg lists no identifiable keys', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({
        stdout: 'grp:::::::::9323654C065DA99813D377011A1:',
      });
    const id = await getGPGIdentity(mockRunCmd);
    expect(id).toEqual('');
  });

  it('clearsign signs stringified object with GPG', async () => {
    const signedOutput = `
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

{ "test": "data" }
-----BEGIN PGP SIGNATURE-----

eQIcBAEBCAAdFiEEYorQz7eDsQ/hmM9h5zhp4CrmDB4FAmBEFHAACgkQ5zhp4Crm
dpVD0hfMB1rG4n8HtvVOyoju0S62eRShON5u1bDyJsuIoB34fOGTyb7hVEEsjHZq
nVfN9h4UoywyzONofymnOKdgxxVjbhuttkBztAujaolkeR8Uhp0XsNuBj3ARqKMM
gopUr20+jOVMJiFRKq+AnHZ2rZ78BCPCcFv4xqImai0gAz/1K+nv4yPP80Al6KO+
/11FVdBN381FaEGG5xeBgKThFyGBriSDbmP4EHpYersNa40/2wo=
-----END PGP SIGNATURE-----`;
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({ stdout: signedOutput, failed: false });
    const sig = await clearsign({ test: 'data' }, mockRunCmd);
    expect(sig).toEqual(signedOutput);
  });

  it('clearsign returns empty string when gpg fails to execute properly', async () => {
    const mockRunCmd = jest.fn().mockRejectedValue(new Error('ENOENT'));
    const id = await clearsign('test data', mockRunCmd);
    expect(id).toEqual('');
  });

  const rootSHA = 'a1b2c3d4e5f60718293a';

  it('getRootSHA returns the SHA of the initial commit for local repo', async () => {
    const mockRunCmd = jest.fn().mockResolvedValueOnce({ stdout: rootSHA });
    const sha = await getRootSHA(mockRunCmd);
    expect(sha).toEqual(rootSHA);
  });

  it('createOverride returns signable object', async () => {
    const justification = 'test override';
    const expiry = Date.now();
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({ stdout: gpgIdRaw })
      .mockResolvedValueOnce({ stdout: rootSHA });
    const override = await createOverride(
      -10,
      expiry,
      justification,
      mockRunCmd
    );
    expect(override.credit).toBe(-10);
    expect(override.exp).toBe(expiry);
    expect(override.justification).toBe(justification);
    expect(override.rootSHA).toBe(rootSHA);
    expect(override.signedBy).toBe(gpgId);
  });

  it('importPublicKeys imports all given keys', async () => {
    const mockRunCmd = jest.fn().mockResolvedValue({
      stdout: `
gpg: keybox './somekeyring.gpg' created
gpg: key C348A9E00AE60B1C: public key "Trusted User <trusted.user@corp.com>" imported
gpg: Total number processed: 1
gpg:               imported: 1
`,
    });

    const keys = ['/some/path/to/key1.gpg', '/some/path/to/key2.gpg'];

    await importPublicKeys(keys, mockRunCmd);
    expect(mockRunCmd).toHaveBeenCalledTimes(2);
  });

  it('gatherFacts gathers basic Risk Override facts', async () => {
    const konfig = cloneDeep(config);
    konfig.flags.pubkeyDir = path.join(__dirname, '../test/fixtures/gpgKeys');
    konfig.flags.dir = path.join(__dirname, '../test/fixtures');

    const invalidKey = path.join(
      __dirname,
      '../test/fixtures/gpgKeys/invalid.gpg'
    );
    await fs.chmod(invalidKey, '777'); // world writable, hence invalid

    const facts = await gatherFacts(konfig);
    expect(facts.override.trustedPubKeysDir).toEqual(konfig.flags.pubkeyDir);
    expect(facts.override.trustedPubKeys.length).toEqual(2);
    expect(facts.override.repoOverrides.length).toEqual(1);
  });

  it('validateOverride returns false if Override is expired', async () => {
    const mockRunCmd = jest.fn();
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000; // in millis
    const o: Override = {
      signedBy: 'some user',
      exp: twoDaysAgo,
      expires: new Date(twoDaysAgo).toString(),
      rootSHA: 'abcd',
      justification: 'test',
      credit: -1,
    };
    await expect(validateOverride(o, new Date(), mockRunCmd)).resolves.toBe(
      false
    );
  });

  it('validateOverride returns false if rootSHA does not match', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'fedcba98766543210' });
    const twoDaysFromNow = Date.now() + 2 * 24 * 60 * 60 * 1000; // in millis
    const o: Override = {
      signedBy: 'some user',
      exp: twoDaysFromNow,
      expires: new Date(twoDaysFromNow).toString(),
      rootSHA: '0123456789abcdef',
      justification: 'test',
      credit: -1,
    };
    await expect(validateOverride(o, new Date(), mockRunCmd)).resolves.toBe(
      false
    );
  });

  it('validateOverride returns true if not expired and rootSHAs match', async () => {
    const rootSHA = 'a1b2c3d4e5f6543210';
    const mockRunCmd = jest.fn().mockResolvedValueOnce({ stdout: rootSHA });
    const twoDaysFromNow = Date.now() + 2 * 24 * 60 * 60 * 1000; // in millis
    const o: Override = {
      signedBy: 'some user',
      exp: twoDaysFromNow,
      expires: new Date(twoDaysFromNow).toString(),
      rootSHA,
      justification: 'test',
      credit: -1,
    };
    await expect(validateOverride(o, new Date(), mockRunCmd)).resolves.toBe(
      true
    );
  });

  it('verifyOverrideSignature returns true if .asc file can be GPG verified', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({
        failed: false,
        stdout: '',
        stderr: 'Good signature from some user <some.user@corp.com>',
      });
    await expect(
      verifyOverrideSignature('somefile.asc', mockRunCmd)
    ).resolves.toBe(true);
  });

  it('verifyOverrideSignature returns false if .asc file can NOT be GPG verified', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({
        failed: true,
        stdout: '',
        stderr: 'ENOENT file not found',
      });
    await expect(
      verifyOverrideSignature('someotherfile.asc', mockRunCmd)
    ).resolves.toBe(false);
  });

  it('parseOverride returns parsed object from clearsigned file', async () => {
    const oFile = path.join(
      __dirname,
      '../test/fixtures/.peril/override-until_2021-03-13T00:58:47.392Z.asc'
    );
    const parsed = await parseOverride(oFile);
    expect(parsed).toEqual(testOverride);
  });

  it('parseOverride returns empty object if it cannot parse file', async () => {
    const parsed = await parseOverride('notafile');
    expect(parsed).toEqual({});
  });

  it('validatePubKeys returns [] if keys cannot be accessed', async () => {
    const validated = await validatePubKeys(['notafile']);
    expect(validated).toEqual([]);
  });

  it('validatePubKeys returns [] if keys are world writable', async () => {
    const key = path.join(__dirname, '../test/fixtures/gpgKeys/invalid.gpg');
    await fs.chmod(key, '777'); // world writable
    const validated = await validatePubKeys([key]);
    expect(validated).toEqual([]);
  });

  it('importPublicKeys calls "gpg --import" for all provided keys', async () => {
    const keys = ['one.gpg', 'two.gpg'];
    const mockRunCmd = jest
      .fn()
      .mockResolvedValue({ failed: false, stdout: '' });
    await importPublicKeys(keys, mockRunCmd);
    expect(mockRunCmd).toHaveBeenCalledTimes(2);
  });

  it('importPublicKeys logs failure if gpg is unable to import key', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({ failed: true, stderr: 'ENOENT' });
    const beforeOutput = getLogOutput();
    await importPublicKeys(['foo.gpg'], mockRunCmd);
    const afterOutput = getLogOutput();
    expect(afterOutput !== beforeOutput).toBe(true);
  });

  it('removePublicKeyring shells out to bash "rm" to cleanup keyring file', async () => {
    const mockRunCmd = jest
      .fn()
      .mockResolvedValueOnce({ failed: false, stdout: '' });
    await removePublicKeyring(mockRunCmd);
    expect(mockRunCmd).toHaveBeenCalledTimes(1);
    expect(mockRunCmd).toHaveBeenCalledWith(
      expect.stringMatching(/rm .+/),
      expect.objectContaining({ shell: true })
    );
  });
});
