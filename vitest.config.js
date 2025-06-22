import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        '**/*.spec.js',
        'coverage/',
        '.git/',
        'database/migrations/',
        'database/seeders/',
        '*.config.js'
      ]
    },
    // Setup files for different test types
    setupFiles: ['./tests/setup/setup.js'], // Backward compatibility
    testMatch: [
      './tests/**/*.test.js',
      './tests/**/*.integration.test.js'
    ],
    watchExclude: ['node_modules/**', '.git/**'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    // Enhanced setup system configuration
    env: {
      NODE_ENV: 'test',
      VITEST_ENHANCED_SETUP: 'true'
    },
    // Exclude demo and example files from regular test runs
    exclude: [
      'node_modules/**',
      'tests/setup/demo.test.js',
      'tests/setup/examples.js'
    ]
  }
}); 