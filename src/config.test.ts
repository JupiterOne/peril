import { gatherOptionalConfig, getConfig, initConfig } from './config';
import { config } from '../test/fixtures/testConfig';
import { cloneDeep, get } from 'lodash';
import path from 'path';

jest.mock('./scm');

describe('config', () => {
  it('config sets a default logLevel', () => {
    expect(getConfig().env.logLevel).toEqual('info');
  });

  it('gathers facts from all relevant modules', async () => {
    await initConfig({ dir: process.cwd() });
    expect(getConfig().facts).toBeTruthy();
  });

  it('gatherOptionalConfig returns parsed JSON from fs', async () => {
    const optional = {
      facts: {
        key1: 'val1',
        key2: 'val2'
      }
    };
    const cfg = cloneDeep(config);
    cfg.flags.config = __dirname + '/../defaultConfig.json';
    const optconfig = await gatherOptionalConfig(cfg, jest.fn().mockReturnValueOnce(JSON.stringify(optional)));
    expect((optconfig.facts as any).key1).toEqual(optional.facts.key1);
    expect((optconfig.facts as any).key2).toEqual(optional.facts.key2);
    // JSON parsing errors will return empty object
    expect(await gatherOptionalConfig(cfg, jest.fn().mockReturnValueOnce(''))).toEqual({});
  });

  it.only('gatherOptionalConfig returns parsed JSON from executable', async () => {
    const cfg = cloneDeep(config);
    // executable script provides custom facts
    cfg.flags.config = path.join(__dirname, '/../test/fixtures/testConfig.sh');
    const optconfig = await gatherOptionalConfig(cfg);
    expect(typeof optconfig).toBe('object');
  });
});
