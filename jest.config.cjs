module.exports = {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true
}; 