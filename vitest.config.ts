import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['out/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/core/engine/finding.ts',
        'src/core/engine/pass.ts',
        'src/core/fixes/fix.ts',
        'src/core/ir/nodes.ts',
        'src/core/ir/sourceLocation.ts',
        'src/test-utils/**'
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
      },
      reporter: ['text', 'json-summary', 'html']
    }
  }
});