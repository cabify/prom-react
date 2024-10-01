module.exports = {
  extends: ['@cabify/eslint-config/recommended'],
  ignorePatterns: [
    'webpack',
    'jest.config.js',
    'babel.config.js',
    '.eslintrc.js',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    createDefaultProgram: true,
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
