module.exports = {
  ...require('@jupiterone/typescript-tools/config/jest'),
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['src/createLogger.ts', 'src/types.ts', 'src/index.ts'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};
