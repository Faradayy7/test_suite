// send-slack-summary.js
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const REPORT_PATH = process.env.PW_JSON || "playwright-report/json-report.json";
const REPORT_URL =
  process.env.REPORT_URL || "https://faradayy7.github.io/endpoint-sentinel/";
const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const ENV_NAME =
  process.env.ENVIRONMENT || process.env.NODE_ENV || "development";
const TZ = process.env.TZ || "America/Bogota";
const MAX_FAILS = parseInt(process.env.MAX_FAILS || "5", 10);

if (!WEBHOOK_URL) {
  console.error("Falta SLACK_WEBHOOK_URL en .env");
  process.exit(1);
}
if (!fs.existsSync(REPORT_PATH)) {
  console.error("No se encontró el reporte JSON:", REPORT_PATH);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));

// Helpers
const secs = (ms) => (Math.round((ms || 0) / 10) / 100).toFixed(2);
const collectTests = (suites = [], out = []) => {
  for (const s of suites) {
    if (s.specs) {
      for (const spec of s.specs) {
        for (const t of spec.tests || []) {
          const r = (t.results || [])[t.results?.length - 1] || {};
          out.push({
            file: spec.file || s.file,
            title: spec.title || s.title,
            status: r.status || t.expectedStatus || "unknown",
            durationMs: r.duration || 0,
            stdout: (r.stdout || []).map((o) => o.text || "").join("\n"),
            error: (r.errors || [])[0]?.message || "",
          });
        }
      }
    }
    if (s.suites) collectTests(s.suites, out);
  }
  return out;
};

// Stats
const { stats = {} } = report;
const total =
  (stats.expected || 0) +
  (stats.unexpected || 0) +
  (stats.skipped || 0) +
  (stats.flaky || 0);
const passed = stats.expected || 0;
const failed = stats.unexpected || 0;
const skipped = stats.skipped || 0;
const flaky = stats.flaky || 0;
const passRate = total ? Math.round((passed / total) * 100) : 0;
const durationSec = secs(stats.duration);

// Detalle fallos
const tests = collectTests(report.suites || []);
const failedTests = tests.filter((t) =>
  ["failed", "timedOut", "interrupted", "crashed"].includes(t.status)
);
const failLines = failedTests.slice(0, MAX_FAILS).map((t) => {
  const m = t.stdout.match(/Status code:\s*(\d+)/i);
  const http = m ? `, HTTP ${m[1]}` : "";
  return `• *${t.title}*\n  _${t.file}_\n  Estado: *${t.status}* (${t.durationMs} ms${http})`;
});
if (failedTests.length > MAX_FAILS) {
  failLines.push(`… y ${failedTests.length - MAX_FAILS} fallos más`);
}


const statusLine =
  failed === 0 && total > 0
    ? "Todos los tests pasaron :large_green_circle:"
    : `Se detectaron ${failed} fallo(s) :no_entry_sign:`;

const blocks = [
  {
    type: "section",
    text: { type: "mrkdwn", text: "🛡️ *Endpoint – Test Report*" },
  },
  { type: "divider" }, // ← línea entre título y estado
  { type: "section", text: { type: "mrkdwn", text: `*${statusLine}*` } },
  {
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Total:*\n${total}` },
      { type: "mrkdwn", text: `*Passed:*\n${passed}` },
      { type: "mrkdwn", text: `*Failed:*\n${failed}` },
      { type: "mrkdwn", text: `*Skipped:*\n${skipped}` },
      { type: "mrkdwn", text: `*Flaky:*\n${flaky}` },
      { type: "mrkdwn", text: `*Pass rate:*\n${passRate}%` },
      { type: "mrkdwn", text: `*Duración:*\n${durationSec}s` },
      { type: "mrkdwn", text: `*Ambiente:*\n${ENV_NAME}` },
      { type: "mrkdwn", text: `*Reporte:*\n<${REPORT_URL}|reporte>` },
    ],
  },
];

if (failedTests.length) {
  blocks.push({ type: "divider" });
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Fallos (${failedTests.length})*:\n${failLines.join("\n\n")}`,
    },
  });
}

blocks.push({
  type: "context",
  elements: [
    { type: "mrkdwn", text: "Endpoint Sentinel QA • Automated Testing" },
  ],
});

// Fallback para clientes sin blocks
const fallbackText = `Endpoint – Test Report | Total: ${total}, Passed: ${passed}, Failed: ${failed}, Pass rate: ${passRate}% | Reporte: ${REPORT_URL}`;

axios
  .post(WEBHOOK_URL, { blocks, text: fallbackText })
  .then(() => console.log("Resumen enviado a Slack"))
  .catch((err) => {
    console.error(
      "Error enviando a Slack:",
      err?.response?.data || err.message
    );
    process.exit(1);
  });
