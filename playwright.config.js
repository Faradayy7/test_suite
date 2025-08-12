/**
 * Playwright Test Configuration para pruebas UI profesionales
 * - baseURL: https://dev.platform.mediastre.am/
 * - Captura de screenshots y video en cada test
 * - Trazas (trace) para depuración
 * - Retries y timeout global
 */

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  use: {
    baseURL: "https://dev.platform.mediastre.am/",
    screenshot: "only-on-failure", // 'on', 'only-on-failure', 'off'
    video: "retain-on-failure", // 'on', 'retain-on-failure', 'off'
    trace: "retain-on-failure", // 'on', 'retain-on-failure', 'off'
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/json-report.json" }],
  ],
  timeout: 60000, // Timeout global por test
  projects: [
    {
      name: "chromium",
      use: { ...{ browserName: "chromium" } },
    },
    {
      name: "firefox",
      use: { ...{ browserName: "firefox" } },
    },
    {
      name: "webkit",
      use: { ...{ browserName: "webkit" } },
    },
  ],
});
