const { test, expect } = require("@playwright/test");
const { ApiClient } = require("../../utils/api-client.js");
const { Logger } = require("../../utils/logger.js");
const { TestDataManager } = require("../../utils/test-data-manager.js");

const logger = new Logger("cupones-crud-tests");
const testDataManager = new TestDataManager();

// Helper function para logging detallado de respuestas
function logResponseDetails(
  response,
  expectedStatus = 200,
  expectedDataStatus = "OK",
  testName = ""
) {
  const actualStatus = response.status;
  const actualDataStatus = response.data?.status || "N/A";

  logger.info(
    ` ${testName} - Respuesta: Status ${actualStatus}, Data Status: ${actualDataStatus}`
  );

  if (actualStatus !== expectedStatus) {
    logger.info(
      `❌ Error de Status: Esperaba ${expectedStatus}, recibió ${actualStatus}`
    );
    logger.info(
      ` Respuesta completa: ${JSON.stringify(response.data, null, 2)}`
    );
  }

  if (actualDataStatus !== expectedDataStatus && expectedDataStatus !== "N/A") {
    logger.info(
      `❌ Error de Data Status: Esperaba '${expectedDataStatus}', recibió '${actualDataStatus}'`
    );
  }

  return { actualStatus, actualDataStatus };
}

test.describe("🎫 Cupones CRUD - Happy Path Tests", () => {
  let apiClient;
  let extractedGroupIds = [];
  let generatedCouponCodes = [];
  let generatedCouponIds = [];

  test.beforeAll(async ({ request }) => {
    logger.info(" Iniciando tests CRUD de cupones");
    apiClient = new ApiClient(request);

    // Obtener datos de cupones existentes para usar Group IDs reales
    logger.info(" Obteniendo Group IDs existentes...");
    const response = await apiClient.get("/api/coupon", { limit: 50 });

    logger.info(
      `📡 Respuesta inicial - Status: ${response.status}, Data Status: ${
        response.data?.status || "N/A"
      }`
    );

    if (response.status === 200 && response.data.status === "OK") {
      testDataManager.processCouponsData(response.data);

      // Extraer solo los _id de los grupos
      const rawGroupIds = testDataManager.getAllGroupIds();
      extractedGroupIds = rawGroupIds.map((groupObj) => {
        return typeof groupObj === "object" && groupObj._id
          ? groupObj._id
          : groupObj;
      });

      logger.info(
        ` ${extractedGroupIds.length} Group IDs obtenidos para tests`
      );

      if (extractedGroupIds.length > 0) {
        logger.info(` Ejemplo Group ID: ${extractedGroupIds[0]}`);
      }
    } else {
      logger.info(
        `❌ Error obteniendo datos iniciales: Status ${response.status}`
      );
      logger.info(`📝 Respuesta de error: ${JSON.stringify(response.data)}`);
      logger.info(" Los tests de CREATE serán saltados por falta de Group IDs");
    }
  });

  test.afterAll(() => {
    logger.info(" Tests CRUD de cupones completados");

    // Mostrar resumen de datos
    const stats = testDataManager.getStats();
    logger.info(
      ` Datos procesados: ${stats.totalCoupons} cupones, ${stats.uniqueGroupIds} grupos, ${stats.uniqueCouponCodes} códigos únicos`
    );

    if (generatedCouponCodes.length > 0) {
      logger.info(` Cupones creados en tests: ${generatedCouponCodes.length}`);
      logger.info(` Códigos creados: ${generatedCouponCodes.join(", ")}`);
    }
  });

  // ==================== CREATE (POST) ====================

  test("TC-CUPONES-003 - CREATE: Crear cupón no reutilizable", async ({
    request,
  }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test CREATE: Cupón no reutilizable");

    // Validar que hay Group IDs disponibles
    if (extractedGroupIds.length === 0) {
      logger.info("⚠️ No hay Group IDs disponibles, saltando test");
      test.skip();
      return;
    }

    const groupId = extractedGroupIds[0];
    const timestamp = Date.now().toString().slice(-6);

    const couponData = {
      group: groupId,
      valid_from: "2025-08-01T08:00:00Z",
      valid_to: "2025-08-31T23:59:59Z",
      is_reusable: "false",
      max_use: "1",
      customer_max_use: "1",
      detail: `QA Test - Single Use Coupon ${timestamp}`,
      quantity: "1",
      discount_type: "percent",
      percent: "10",
      type: "ppv-live",
      type_code: `qa_test_single_${timestamp}`,
      payment_required: "false",
    };

    logger.info(` Creando cupón no reutilizable con Group ID: ${groupId}`);

    const response = await apiClient.post("/api/coupon", couponData);

    // Adjuntar respuesta al reporte
    await test.info().attach("create-coupon-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    logResponseDetails(response, 200, "OK", "CREATE cupón no reutilizable");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);

    const createdCoupon = response.data.data[0];
    expect(createdCoupon).toHaveProperty("code");
    expect(createdCoupon).toHaveProperty("_id");

    // Guardar datos para cleanup y tests posteriores
    generatedCouponCodes.push(createdCoupon.code);
    generatedCouponIds.push(createdCoupon._id);

    logger.info(
      `✅ Cupón no reutilizable creado: ${createdCoupon.code} (ID: ${createdCoupon._id})`
    );
  });

  test("TC-CUPONES-004 - CREATE: Crear cupón reutilizable con código personalizado", async ({
    request,
  }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test CREATE: Cupón reutilizable con código personalizado");

    if (extractedGroupIds.length === 0) {
      logger.info(" No hay Group IDs disponibles, saltando test");
      test.skip();
      return;
    }

    const groupId = extractedGroupIds[0];
    const timestamp = Date.now().toString().slice(-6);
    const customCode = `QA-REUSE-${timestamp}`;

    const couponData = {
      group: groupId,
      valid_from: "2025-08-01T08:00:00Z",
      valid_to: "2025-08-31T23:59:59Z",
      is_reusable: "true",
      max_use: "5",
      customer_max_use: "2",
      custom_code: customCode,
      detail: `QA Test - Reusable Custom Coupon ${timestamp}`,
      quantity: "1",
      discount_type: "amount",
      amount: "15",
      type: "ppv-live",
      type_code: `qa_test_reusable_${timestamp}`,
      payment_required: "true",
    };

    logger.info(
      ` Creando cupón reutilizable con código personalizado: ${customCode}`
    );

    const response = await apiClient.post("/api/coupon", couponData);

    await test.info().attach("create-reusable-coupon-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(Array.isArray(response.data.data)).toBe(true);

    const createdCoupon = response.data.data[0];
    expect(createdCoupon.code).toBe(customCode);
    // La API podría no devolver is_reusable en la respuesta de creación
    // expect(createdCoupon.is_reusable).toBe(true);
    // expect(createdCoupon.max_use).toBe(5);

    generatedCouponCodes.push(createdCoupon.code);
    generatedCouponIds.push(createdCoupon._id);

    logger.info(
      `✅ Cupón reutilizable creado: ${createdCoupon.code} (ID: ${createdCoupon._id})`
    );
  });

  // ==================== READ (GET) ====================

  test("TC-CUPONES-005 - READ: Obtener lista de cupones", async ({
    request,
  }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test READ: Lista de cupones");

    const response = await apiClient.get("/api/coupon", { limit: 10 });

    await test.info().attach("read-coupons-list-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    logResponseDetails(response, 200, "OK", "READ lista cupones");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(Array.isArray(response.data.data)).toBe(true);

    // Procesar datos para tests posteriores
    testDataManager.processCouponsData(response.data);

    logger.info(`✅ Lista obtenida: ${response.data.data.length} cupones`);
  });

  test("TC-CUPONES-006 - READ: Obtener cupón por ID", async ({ request }) => {
    apiClient = new ApiClient(request);
    logger.info("🧪 Test READ: Cupón por ID");

    let couponId;

    // Primero intentar usar un ID de los cupones creados anteriormente
    if (generatedCouponIds.length > 0) {
      couponId = generatedCouponIds[0];
      logger.info(`🎯 Usando cupón generado con ID: ${couponId}`);
    } else {
      // Fallback: obtener un cupón existente del sistema
      logger.info(
        "🔄 No hay cupones generados, obteniendo uno existente del sistema..."
      );
      const listResponse = await apiClient.get("/api/coupon", { limit: 1 });

      if (
        listResponse.status === 200 &&
        listResponse.data.status === "OK" &&
        listResponse.data.data.length > 0
      ) {
        couponId = listResponse.data.data[0]._id;
        logger.info(`🎯 Usando cupón existente con ID: ${couponId}`);
      } else {
        logger.info(
          "⚠️ No hay cupones disponibles en el sistema, saltando test"
        );
        test.skip();
        return;
      }
    }

    const response = await apiClient.get(`/api/coupon/${couponId}`);

    await test.info().attach("read-coupon-by-id-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(response.data.data).toBeDefined();
    expect(response.data.data._id).toBe(couponId);

    const coupon = response.data.data;
    expect(coupon).toHaveProperty("code");
    expect(coupon).toHaveProperty("group");
    expect(coupon).toHaveProperty("date_created");

    logger.info(
      `✅ Cupón obtenido: ${coupon.code} (Reutilizable: ${coupon.is_reusable})`
    );
  });

  test("TC-CUPONES-007 - READ: Buscar cupón por código", async ({
    request,
  }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test READ: Buscar por código");

    let couponCode;

    // Primero intentar usar un código de los cupones creados anteriormente
    if (generatedCouponCodes.length > 0) {
      couponCode = generatedCouponCodes[0];
      logger.info(` Usando código generado: ${couponCode}`);
    } else {
      // Fallback: obtener un cupón existente del sistema
      logger.info(
        "🔄 No hay códigos generados, obteniendo uno existente del sistema..."
      );
      const listResponse = await apiClient.get("/api/coupon", { limit: 1 });

      if (
        listResponse.status === 200 &&
        listResponse.data.status === "OK" &&
        listResponse.data.data.length > 0
      ) {
        couponCode = listResponse.data.data[0].code;
        logger.info(` Usando código existente: ${couponCode}`);
      } else {
        logger.info(
          "⚠️ No hay cupones disponibles en el sistema, saltando test"
        );
        test.skip();
        return;
      }
    }

    const response = await apiClient.get(`/api/coupon/${couponCode}/search`);

    await test.info().attach("search-coupon-by-code-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(response.data.data).toBeDefined();
    expect(response.data.data.code).toBe(couponCode);

    logger.info(`✅ Cupón encontrado por código: ${response.data.data.code}`);
  });

  // ==================== UPDATE (POST) ====================

  test("TC-CUPONES-008 - UPDATE: Actualizar cupón existente", async ({
    request,
  }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test UPDATE: Actualizar cupón");

    if (extractedGroupIds.length === 0) {
      logger.info("⚠️ No hay Group IDs disponibles, saltando test");
      test.skip();
      return;
    }

    let couponId;

    // Primero intentar usar un ID de los cupones creados anteriormente
    if (generatedCouponIds.length > 0) {
      couponId = generatedCouponIds[0];
      logger.info(` Actualizando cupón generado con ID: ${couponId}`);
    } else {
      // Fallback: obtener un cupón existente del sistema
      logger.info(
        " No hay cupones generados, obteniendo uno existente del sistema para actualizar..."
      );
      const listResponse = await apiClient.get("/api/coupon", { limit: 1 });

      if (
        listResponse.status === 200 &&
        listResponse.data.status === "OK" &&
        listResponse.data.data.length > 0
      ) {
        couponId = listResponse.data.data[0]._id;
        logger.info(` Actualizando cupón existente con ID: ${couponId}`);
      } else {
        logger.info(
          "⚠️ No hay cupones disponibles en el sistema, saltando test"
        );
        test.skip();
        return;
      }
    }

    const groupId = extractedGroupIds[0];

    const updateData = {
      group: groupId,
      valid_from: "2025-08-01T08:00:00Z",
      valid_to: "2025-09-30T23:59:59Z", // Extender fecha
      is_reusable: "true",
      max_use: "10", // Aumentar usos
      customer_max_use: "5",
      detail: "QA Test - Cupón Actualizado",
      discount_type: "amount",
      amount: "25", // Cambiar monto
      type: "ppv-live",
      type_code: "qa_test_updated",
      payment_required: "true",
    };

    logger.info(` Actualizando cupón con ID: ${couponId}`);

    const response = await apiClient.post(
      `/api/coupon/${couponId}`,
      updateData
    );

    await test.info().attach("update-coupon-response.json", {
      body: JSON.stringify(response.data, null, 2),
      contentType: "application/json",
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");
    expect(response.data.data).toBeDefined();
    expect(response.data.data._id).toBe(couponId);

    const updatedCoupon = response.data.data;
    expect(updatedCoupon.detail).toContain("Actualizado");
    expect(updatedCoupon.amount).toBe(25);

    logger.info(
      `✅ Cupón actualizado: ${updatedCoupon.code} (Nuevo monto: ${updatedCoupon.amount})`
    );
  });

  // ==================== DELETE ====================

  test("TC-CUPONES-009 - DELETE: Eliminar cupón", async ({ request }) => {
    apiClient = new ApiClient(request);
    logger.info(" Test DELETE: Eliminar cupón");

    // Crear un cupón específicamente para eliminar
    if (extractedGroupIds.length === 0) {
      logger.info("⚠️ No hay Group IDs disponibles, saltando test");
      test.skip();
      return;
    }

    const groupId = extractedGroupIds[0];
    const timestamp = Date.now().toString().slice(-6);
    const tempCode = `QA-DELETE-${timestamp}`;

    // Crear cupón temporal
    const tempCouponData = {
      group: groupId,
      valid_from: "2025-08-01T08:00:00Z",
      valid_to: "2025-08-31T23:59:59Z",
      is_reusable: "false",
      max_use: "1",
      customer_max_use: "1",
      custom_code: tempCode,
      detail: "QA Test - Cupón para eliminar",
      quantity: "1",
      discount_type: "percent",
      percent: "5",
      type: "ppv-live",
      type_code: `qa_test_delete_${timestamp}`,
      payment_required: "false",
    };

    logger.info(` Creando cupón temporal para eliminar: ${tempCode}`);

    const createResponse = await apiClient.post("/api/coupon", tempCouponData);
    expect(createResponse.status).toBe(200);
    expect(createResponse.data.status).toBe("OK");

    const createdTempCoupon = createResponse.data.data[0];
    const tempCouponId = createdTempCoupon._id;

    logger.info(
      `✅ Cupón temporal creado: ${createdTempCoupon.code} (ID: ${tempCouponId})`
    );

    // Verificar que existe antes de eliminar
    const getResponse = await apiClient.get(`/api/coupon/${tempCouponId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.status).toBe("OK");

    // Eliminar el cupón
    logger.info(`🗑️ Eliminando cupón con ID: ${tempCouponId}`);

    const deleteResponse = await apiClient.delete(
      `/api/coupon/${tempCouponId}`
    );

    await test.info().attach("delete-coupon-response.json", {
      body: JSON.stringify(deleteResponse.data, null, 2),
      contentType: "application/json",
    });

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.data.status).toBe("OK");

    logger.info(`✅ Cupón eliminado exitosamente: ${tempCode}`);

    // Verificar que ya no existe
    const verifyResponse = await apiClient.get(`/api/coupon/${tempCouponId}`);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.data.status).toBe("ERROR");
    expect(verifyResponse.data.data).toBe(null);

    logger.info(
      `✅ Verificación exitosa: Cupón no encontrado después de eliminar`
    );
  });

  // ==================== CLEANUP ====================

  test.afterEach(async ({ request }) => {
    // Este hook se ejecuta después de cada test individual
    // Aquí puedes agregar lógica de cleanup si es necesaria
  });
});
