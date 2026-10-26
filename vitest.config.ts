import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Inline Auth.js so vi.mock can intercept its own `next/headers` import
    // (tests/integration/auth-current-user.test.ts drives the real auth()).
    server: { deps: { inline: [/next-auth/, /@auth\//] } },
  },
});
