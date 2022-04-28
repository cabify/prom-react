const path = require('path');

module.exports = {
  rootDir: path.resolve('./'),
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/fileMock.js',
    '^.*\\.scss$': '<rootDir>/test/styleMock.js',
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
