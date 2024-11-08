const path = require('path');

module.exports = {
  rootDir: path.resolve('./'),
  testEnvironment: 'jest-fixed-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testMatch: ['<rootDir>/src/**/*.spec.(ts|tsx)'],
  transform: {
    '^.+\\.(ts|tsx|js)$': 'babel-jest',
  },
  coverageReporters: ['text'],
  coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
};
