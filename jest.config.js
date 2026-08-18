// jest.config.js
export default {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  transform: {},
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['<rootDir>/tests/jest.setup.js']
};
