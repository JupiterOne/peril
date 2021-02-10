import { gatherOptionalConfig, getConfig, initConfig } from './config';
import { config } from '../test/fixtures/testConfig';

jest.mock('./scm');

describe('config', () => {
  it('config sets a default logLevel', () => {
    expect(getConfig().env.logLevel).toEqual('info');
  });

  it('gathers facts from all relevant modules', async () => {
    await initConfig({ dir: process.cwd() });
    expect(getConfig().facts).toBeTruthy();
  });

  it('gatherOptionalConfigValues returns parsed JSON from fs', async () => {
    const optional = {
      key1: 'val1',
      key2: 'val2'
    };
    const values = await gatherOptionalConfig(config, jest.fn().mockReturnValueOnce(JSON.stringify(optional)));
    expect(values).toEqual(optional);
  });
});
