module.exports = {
  extends: ['@cabify/eslint-config/recommended'],
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
