const { test, expect } = require("@playwright/test");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ajv = new Ajv({ allErrors: true, $data: true });
addFormats(ajv);

const schema = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../../src/schemas/cupones/grupo-list.schema.json"),
    "utf8"
  )
);

const API_BASE_URL = process.env.API_BASE_URL || "";
const API_TOKEN = process.env.API_TOKEN || "";
if (!API_BASE_URL || !API_TOKEN) {
  throw new Error("Faltan variables de entorno API_BASE_URL o API_TOKEN");
}

test.describe("TC-CUPONES-001 - Contrato grupo", () => {
  test("debe responder con status 200 y cumplir el contrato del schema", async ({
    request,
  }) => {
    const apiUrl = `${API_BASE_URL}/api/coupon-group?token=${API_TOKEN}`;
    const response = await request.get(apiUrl, {
      headers: {
        "X-API-Token": API_TOKEN,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();

    // Adjuntar el body de la respuesta al reporte HTML de Playwright
    await test.info().attach("response-body.json", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    });

    // Loggear el status code de la respuesta
    console.log(`Status code: ${response.status()}`);

    const validate = ajv.compile(schema);
    const valid = validate(body);
    if (!valid) {
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
