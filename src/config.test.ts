import { getConfig, initConfig } from './config';
jest.mock('./scm');

describe('config', () => {
  it('config sets a default logLevel', () => {
    expect(getConfig().env.logLevel).toEqual('info');
  });

  it('gathers facts from all relevant modules', async () => {
    await initConfig({});
    expect(getConfig().facts).toBeTruthy();
  });
});
