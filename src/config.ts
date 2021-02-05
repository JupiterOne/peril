import * as configReader from '@jupiterone/platform-sdk-config-reader';
import { Config, Facts } from './types';
import * as scm from './scm';
import * as code from './code';
import * as jupiterone  from './jupiterone';
import * as project from './project';
import * as fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';

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
    ...await code.gatherFacts(),
    ...await jupiterone.gatherFacts(),
    ...await project.gatherFacts()
  };
  return facts as Facts;
}

const config: any = {
  env: envConfig,
}

export async function initConfig(flags: object) {
  config.flags = flags;
  config.facts = await gatherAllFacts();
  const defaultConfigValues: Config['values'] = JSON.parse(await fs.readFile(path.join(__dirname, '../defaultConfig.json'), 'utf8'));
  const optionalConfigValues = await gatherOptionalConfigValues();
  // deep merge optional override config into default values
  config.values = _.merge(defaultConfigValues, optionalConfigValues);
}

export async function gatherOptionalConfigValues(config: Config = getConfig(), readFile: typeof fs.readFile = fs.readFile): Promise<Config['values'] | {}> {
  let configValues: Config['values'];
  try {
    configValues = JSON.parse(await readFile(config.flags.config, 'utf8'));
  } catch (e) {
    return {};
  }
  return configValues;
}

export function getConfig(): Config {
  return config;
}
