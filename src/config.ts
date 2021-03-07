import { Config, Facts } from './types';
import { runCmd, log } from './helpers';
import * as scm from './scm';
import * as code from './code';
import * as jupiterone  from './jupiterone';
import * as project from './project';
import * as fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';

const executable = require('executable');

type KnownEnvironmentVariables = {
  J1_API_TOKEN: string;
  J1_ACCOUNT: string;
  LOG_LEVEL?: string;
  THREAT_DRAGON_DIR: string;
};

const processEnv = process.env as KnownEnvironmentVariables;

export const envConfig = {
  j1AuthToken: _.get(processEnv, 'J1_API_TOKEN'),
  j1Account: _.get(processEnv, 'J1_ACCOUNT'),
  logLevel: _.get(processEnv, 'LOG_LEVEL', 'info'),
  threatDragonDir: _.get(processEnv, 'THREAT_DRAGON_DIR')
};

async function gatherAllFacts(): Promise<Facts> {
  return {
    ...await scm.gatherFacts(),
    ...await code.gatherFacts(),
    ...await jupiterone.gatherFacts(),
    ...await project.gatherFacts()
  };
}

let config: any = {
  env: envConfig,
}

export async function initConfig(flags: object) {
  config.flags = flags;
  config.facts = await gatherAllFacts();
  config.values = JSON.parse(await fs.readFile(path.join(__dirname, '../defaultConfig.json'), 'utf8'));
  const optionalConfig = await gatherOptionalConfig();
  // deep merge optional override config into default config
  config = _.merge(config, optionalConfig);
}

export async function gatherOptionalConfig(config: Config = getConfig(), readFile: typeof fs.readFile = fs.readFile): Promise<Partial<Config>> {
  let optConfig: Partial<Config>;
  if (!config.flags.config) {
    return {};
  }

  try {
    if (await executable(config.flags.config)) {
      const output = await runCmd(config.flags.config);
      optConfig = JSON.parse(output.stdout);
    } else {
      optConfig = JSON.parse(await readFile(config.flags.config, 'utf8'));
    }
  } catch (e) {
    log('error gathering optional config: ' + e, 'DEBUG');
    return {};
  }
  return optConfig;
}

export function getConfig(): Config {
  if (process.env.NODE_ENV === 'test') {
    // console.log('getConfig called during tests')
    return require('../test/fixtures/testConfig').config;
  }
  return config;
}
