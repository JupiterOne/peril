import * as configReader from '@jupiterone/platform-sdk-config-reader';

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
