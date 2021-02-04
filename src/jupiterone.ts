import { JupiterOneClient } from '@jupiterone/jupiterone-client-nodejs';
import { retry, AttemptOptions } from '@lifeomic/attempt';
import { getConfig } from './config';
import { Config, JupiterOneFacts } from './types';

export class J1Client {
  attemptOptions: Partial<AttemptOptions<unknown>>;
  j1Client: JupiterOneClient;
  j1Account: string;
  j1AuthToken: string;

  constructor (j1Account: string, j1AuthToken: string, client = JupiterOneClient) {

    this.attemptOptions = {
      initialDelay: 0,
      minDelay: 0,
      delay: 20000,
      factor: 1.5,
      maxAttempts: 0,
      maxDelay: 70,
      timeout: 60000,
    };

    this.j1Client = new client({
      account: String(j1Account),
      accessToken: String(j1AuthToken),
      dev: Boolean(process.env.J1_DEV_ENABLED)
    });
  }

  async init() {
    await this.j1Client.init();
  }

  getClient() {
    return this.j1Client;
  }

  async gatherEntities(j1ql: string): Promise<unknown> {
    return retry(() => {
      return this.j1Client.queryV1(j1ql);
    }, this.attemptOptions);
  }
}

export async function gatherFacts(config: Config = getConfig()): Promise<JupiterOneFacts> {
  let client;
  const { j1Account, j1AuthToken } = config.env;
  if (j1Account && j1AuthToken) {
    client = new J1Client(j1Account, j1AuthToken);
    await client.init();
  }

  return {
    j1: {
      client
    }
  };
}
