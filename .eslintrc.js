module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'error',
    'block-scoped-var': 'error',
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'max-classes-per-file': ['error', 1],
    'no-alert': 'error',
    'no-floating-decimal': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'require-await': 'warn',
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreComments: true }]
  }
}; 