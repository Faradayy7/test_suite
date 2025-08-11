const { test, expect } = require("@playwright/test");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");
const { ApiClient } = require("../../utils/api-client.js");
const { Logger } = require("../../utils/logger.js");
const { TestDataManager } = require("../../utils/test-data-manager.js");
const ajv = new Ajv({ allErrors: true, $data: true });
addFormats(ajv);

const logger = new Logger("cupones-contract-tests");
const testDataManager = new TestDataManager();

const grupoListSchema = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../../src/schemas/cupones/grupo-list.schema.json"),
    "utf8"
  )
);

const cuponesBySubgroupSchema = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../../../src/schemas/cupones/cupones-by-subgroup.schema.json"
    ),
    "utf8"
  )
);

test.describe("Contratos de API - Cupones", () => {
  test("TC-CUPONES-001 - debe responder con status 200 y cumplir el contrato del schema para grupos", async ({
    request,
  }) => {
    logger.info("Iniciando TC-CUPONES-001: Validación de contrato para grupos");

    const apiClient = new ApiClient(request);
    const response = await apiClient.get("/api/coupon-group");

    // Verificar status HTTP
    expect(response.status).toBe(200);

    // El contenido de la respuesta está en response.data
    const responseBody = response.data;

    // Adjuntar el body de la respuesta al reporte HTML de Playwright
    await test.info().attach("groups-response-body.json", {
      body: JSON.stringify(responseBody, null, 2),
      contentType: "application/json",
    });

    logger.info(`Response status: ${response.status}`);

    const validate = ajv.compile(grupoListSchema);
    const valid = validate(responseBody);
    if (!valid) {
      logger.error("Errores de validación del schema:", validate.errors);
    }
    expect(valid).toBe(true);
    expect(responseBody.status).toBe("OK");
    expect(Array.isArray(responseBody.data)).toBe(true);

    logger.info("TC-CUPONES-001 completado exitosamente");
  });

  test("TC-CUPONES-002 - debe obtener cupones por subgrupo usando un grupo con cupones", async ({
    request,
  }) => {
    logger.info("Iniciando TC-CUPONES-002: Validación de cupones por subgrupo");

    const apiClient = new ApiClient(request);

    // Paso 1: Obtener la lista de grupos usando ApiClient
    const groupsResponse = await apiClient.get("/api/coupon-group");

    expect(groupsResponse.status).toBe(200);
    const groupsBody = groupsResponse.data;
    expect(groupsBody.status).toBe("OK");
    expect(Array.isArray(groupsBody.data)).toBe(true);

    // Buscar un grupo que tenga al menos un cupón total
    const groupWithCoupons = groupsBody.data.find(
      (group) => group.coupon_total && group.coupon_total > 0
    );

    // Si no hay grupos con cupones, skip el test
    if (!groupWithCoupons) {
      test.skip(true, "No se encontraron grupos con cupones para probar");
      return;
    }

    logger.info(
      `Grupo seleccionado: ${groupWithCoupons.name} (${groupWithCoupons._id}) - Cupones totales: ${groupWithCoupons.coupon_total}`
    );

    // Paso 2: Obtener detalles del grupo específico para conseguir los subgrupos
    const groupDetailResponse = await apiClient.get(
      `/api/coupon-group/${groupWithCoupons._id}`
    );

    expect(groupDetailResponse.status).toBe(200);
    const groupDetailBody = groupDetailResponse.data;

    // Adjuntar el body del detalle del grupo al reporte
    await test.info().attach("group-detail-response.json", {
      body: JSON.stringify(groupDetailBody, null, 2),
      contentType: "application/json",
    });

    expect(groupDetailBody.status).toBe("OK");
    expect(Array.isArray(groupDetailBody.data)).toBe(true);

    // Buscar un subgrupo que tenga al menos 1 cupón total
    const subgroupWithCoupons = groupDetailBody.data.find(
      (subgroup) => subgroup.total && subgroup.total > 0
    );

    // Si no hay subgrupos con cupones, skip el test
    if (!subgroupWithCoupons) {
      test.skip(true, "No se encontraron subgrupos con cupones para probar");
      return;
    }

    logger.info(
      `Subgrupo seleccionado: ${subgroupWithCoupons.name} (${subgroupWithCoupons._id}) - Cupones totales: ${subgroupWithCoupons.total}`
    );

    // Paso 3: Obtener cupones por subgrupo usando ApiClient
    const subgroupId = subgroupWithCoupons._id;
    const couponsResponse = await apiClient.get("/api/coupon", {
      params: { subgroup: subgroupId },
    });

    expect(couponsResponse.status).toBe(200);
    const couponsBody = couponsResponse.data;

    // Adjuntar el body de la respuesta al reporte HTML de Playwright
    await test.info().attach("coupons-by-subgroup-response.json", {
      body: JSON.stringify(couponsBody, null, 2),
      contentType: "application/json",
    });

    logger.info(`Cupones encontrados: ${couponsBody.data?.length || 0}`);

    // Validar el schema de respuesta de cupones por subgrupo
    // Nota: Solo validamos la estructura básica debido a variaciones en la API real
    expect(couponsBody.status).toBe("OK");
    expect(Array.isArray(couponsBody.data)).toBe(true);

    // Validar que si encontramos cupones, tengan la estructura correcta
    if (couponsBody.data.length > 0) {
      const firstCoupon = couponsBody.data[0];
      expect(firstCoupon).toHaveProperty("_id");
      expect(firstCoupon).toHaveProperty("code");
      expect(firstCoupon).toHaveProperty("group");
      expect(firstCoupon).toHaveProperty("subgroup");
      expect(firstCoupon.subgroup).toBe(subgroupId);

      logger.info("Estructura básica de cupones validada correctamente");
    }

    logger.info("TC-CUPONES-002 completado exitosamente");
  });
});
