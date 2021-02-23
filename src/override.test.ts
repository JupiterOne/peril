import { getGPGIdentity } from './override';
import { config } from '../test/fixtures/testConfig';
import { cloneDeep } from 'lodash';

describe('override features', () => {
  it('getGPGIdentity parses gpg secret keys list output for identity', async () => {
    const mockRunCmd = jest.fn();
    const id = await getGPGIdentity(
      config,
      mockRunCmd.mockResolvedValueOnce({ stdout: 'uid:u::::14122::41ECEBA211::Some User <some.user@company.com>::::::::::0:'})
    );
    expect(id).toEqual('Some User <some.user@company.com>');
  });

  it('getGPGIdentity returns empty string when gpg is not available', async () => {
    const konfig = cloneDeep(config);
    konfig.facts.scm.gpgPath = undefined;
    const id = await getGPGIdentity(konfig);
    expect(id).toEqual('');
  });

it('getGPGIdentity returns empty string when gpg fails to execute properly', async () => {
    const mockRunCmd = jest.fn().mockRejectedValue(new Error('ENOENT'));
    const id = await getGPGIdentity(config, mockRunCmd);
    expect(id).toEqual('');
  });

it('getGPGIdentity returns empty string when gpg lists no identifiable keys', async () => {
    const mockRunCmd = jest.fn().mockResolvedValueOnce({ stdout: 'grp:::::::::9323654C065DA99813D377011A1:' });
    const id = await getGPGIdentity(config, mockRunCmd);
    expect(id).toEqual('');
  });
});

