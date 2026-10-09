import { defineConfig } from "@playwright/test";

// Builds are a prerequisite: `npm run build -w @humantxt/site && npm run build -w @humantxt/extension`.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
});
