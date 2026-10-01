import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({
  path: ".env.test",
  override: true,
});

process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,

    setupFiles: ["./tests/setup.ts"],

    // Integration tests share one PostgreSQL test database,
    // so run test files sequentially.
    fileParallelism: false,
  },
});