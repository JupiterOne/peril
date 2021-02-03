import { retry, AttemptOptions } from '@lifeomic/attempt';
import { getConfig } from './config';
import { Config } from './types';

const JupiterOneClient = require('@jupiterone/jupiterone-client-nodejs');

export class J1Client {
  attemptOptions: Partial<AttemptOptions<unknown>>;
  client: typeof JupiterOneClient;
  config: Config;

  constructor (config: Config = getConfig(), client = JupiterOneClient) {
    this.config = config;

    this.attemptOptions = {
      initialDelay: 0,
      minDelay: 0,
      delay: 20000,
      factor: 1.5,
      maxAttempts: 0,
      maxDelay: 70,
      timeout: 60000,
    };

    const { j1Account, j1AuthToken } = this.config.env;
    this.client = new client({
      account: String(j1Account),
      accessToken: String(j1AuthToken),
      dev: Boolean(process.env.J1_DEV_ENABLED)
    });
  }

  async init() {
    await this.client.init();
  }

  getClient() {
    return this.client;
  }

  async gatherEntities(j1ql: string): Promise<unknown> {
    return retry(() => {
      return this.client.queryV1(j1ql);
    }, this.attemptOptions);
  }
}
