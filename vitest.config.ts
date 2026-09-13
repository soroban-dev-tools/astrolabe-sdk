import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default to node; files that need a DOM set it per-file with
    // `// @vitest-environment jsdom`.
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
