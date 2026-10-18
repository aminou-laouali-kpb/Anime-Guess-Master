import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      // Clocks run 20x faster so turn/answer/selection timeouts can be tested.
      GAME_TIME_SCALE: "0.05",
    },
    // The game state lives in module-level maps and tests open real sockets.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
