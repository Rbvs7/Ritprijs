import { defineConfig } from 'vitest/config';

// Integratietests tegen echte externe diensten (internet nodig).
export default defineConfig({
  test: { include: ['tests/integration/**/*.itest.ts'] },
});
