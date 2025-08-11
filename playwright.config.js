module.exports = {
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/json-report.json" }],
  ],
  // Puedes agregar aquí otras configuraciones de Playwright si lo necesitas
};
