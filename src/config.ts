import * as configReader from '@jupiterone/platform-sdk-config-reader';

type KnownEnvironmentVariables = {
  DATA_SET_NAME: string;
  LOG_LEVEL?: string;
};

const defaultEnv: KnownEnvironmentVariables = {
  DATA_SET_NAME: 'full',
};

export const envConfig = configReader.readConfigFromEnv(defaultEnv, {
  dataSetName: (env) => configReader.readStringFromEnv(env, 'DATA_SET_NAME'),
  logLevel: (env) => configReader.readStringFromEnv(env, 'LOG_LEVEL', 'info'),
});
