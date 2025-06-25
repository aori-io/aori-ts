module.exports = {
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  root: true,
  env: {
    node: true,
    jest: true,
    es6: true,
    browser: true
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/', 'node_modules/'],
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['error'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}; 