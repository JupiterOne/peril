module.exports = {
  ...require('@jupiterone/typescript-tools/config/jest'),
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['src/createLogger.ts', 'src/types.ts', 'src/index.ts', 'src/processOverrideCLI.ts', 'src/gather.ts'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 50,
      functions: 75,
      lines: 75,
    },
  },
};
