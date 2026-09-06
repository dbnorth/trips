/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/setup.js"],
  modulePathIgnorePatterns: ["<rootDir>/deploy/"],
  maxWorkers: 1,
  // CI MySQL (Docker service) can take >5s for sequelize.sync({ force: true }).
  testTimeout: 30000,
  verbose: true,
};
