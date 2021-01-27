import * as configReader from '@jupiterone/platform-sdk-config-reader';
import { Config, Facts } from './types';
import * as scm from './scm';
import * as code from './code';
import * as fs from 'fs-extra';
import path from 'path';

type KnownEnvironmentVariables = {
  J1_API_TOKEN: string;
  J1_ACCOUNT: string;
  LOG_LEVEL?: string;
};

const processEnv = process.env as KnownEnvironmentVariables;

export const envConfig = configReader.readConfigFromEnv(processEnv, {
  j1AuthToken: (env) => configReader.readStringFromEnv(env, 'J1_API_TOKEN'),
  j1Account: (env) => configReader.readStringFromEnv(env, 'J1_ACCOUNT'),
  logLevel: (env) => configReader.readStringFromEnv(env, 'LOG_LEVEL', 'info'),
});

async function gatherAllFacts(): Promise<Facts> {
  const facts: any = {
    ...await scm.gatherFacts(),
    ...await code.gatherFacts()
  };
  return facts as Facts;
}

const config: any = {
  env: envConfig,
}

export async function initConfig(flags: object) {
  config.flags = flags;
  config.facts = await gatherAllFacts();
  config.values = JSON.parse(await fs.readFile(path.join(__dirname, '../defaultConfig.json'), 'utf8'));
}

export function getConfig(): Config {
  return config;
}
