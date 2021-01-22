import { config, initConfig } from './config';
jest.mock('./scm');

describe('config', () => {
  it('config sets a default logLevel', () => {
    expect(config.env.logLevel).toEqual('info');
  });

  it('gathers facts from all relevant modules', async () => {
    await initConfig();
    expect(config.facts).toBeTruthy();
  });
});
