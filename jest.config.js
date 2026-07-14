/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/testEnv.ts'],
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  // Add the testPathIgnorePatterns to explicitly ignore testEnv.ts
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/testEnv.ts',
  ],
};
