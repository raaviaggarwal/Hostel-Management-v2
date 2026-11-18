import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 60000,
    isolate: true,
    fileParallelism: false,
    threads: false,
    maxConcurrency: 1,
    sequence: {
      shuffle: false,
      hooks: 'all',
    },
    env: {
      BCRYPT_ROUNDS: '4',
      NODE_ENV: 'test',
    },
  },
})