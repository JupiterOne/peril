import { JupiterOneClient } from '@jupiterone/jupiterone-client-nodejs';
import { retry, AttemptOptions } from '@lifeomic/attempt';
import { getConfig } from './config';
import { Config, JupiterOneFacts } from './types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { get } from 'lodash';

export class J1Client {
  attemptOptions: Partial<AttemptOptions<unknown>>;
  j1Client: JupiterOneClient;
  account: string;
  accessToken: string;
  dev: boolean;
  axios: AxiosInstance;


  constructor (j1Account: string, j1AuthToken: string, client = JupiterOneClient, axiosClient = axios) {
    this.dev = Boolean(process.env.J1_DEV_ENABLED);
    this.account = String(j1Account).trim();
    this.accessToken = String(j1AuthToken).trim();

    this.attemptOptions = {
      initialDelay: 0,
      minDelay: 0,
      delay: 200,
      factor: 1.5,
      maxAttempts: 3,
      maxDelay: 10000,
      timeout: 60000,
    };

    this.j1Client = new client({
      account: this.account,
      accessToken: this.accessToken,
      dev: this.dev
    });

    this.axios = axiosClient.create({
      headers: {
        post: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'LifeOmic-Account': this.account
        }
      }
    });
  }

  async init() {
    await this.j1Client.init();
  }

  getClient() {
    return this.j1Client;
  }

  async gatherEntities(j1ql: string): Promise<unknown> {
    let res: unknown = [];
    try {
      res = await retry(() => {
        return this.j1Client.queryV1(j1ql);
      }, this.attemptOptions);
    } catch (e) {
      console.warn('Failed to gather entities for query: ' + j1ql + ' : ' + e);
    }
    return res;
  }

  async getQueryUrl(j1ql: string): Promise<string> {
    const baseUrl = `https://${this.account}.apps.${this.dev ? 'dev' : 'us'}.jupiterone.io`;
    let url: string = '';
    try {
      const res = await retry(() => {
        return this.axios.post(baseUrl + '/api/shortener/encode/url', {
          params: {
            query: j1ql
          },
          baseUrl: baseUrl + '/landing'
        });
      }, this.attemptOptions);
      url = get((res as AxiosResponse).data, 'data.url', '');
    } catch (e) {
      console.warn('Failed to retrieve deep-link for J1 query URL.' + e);
    }
    return url;
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
