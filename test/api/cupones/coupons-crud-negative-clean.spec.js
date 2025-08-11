const { test, expect } = require("@playwright/test");
const { ApiClient } = require("../../utils/api-client.js");
const { Logger } = require("../../utils/logger.js");
const { TestDataManager } = require("../../utils/test-data-manager.js");

const logger = new Logger("cupones-negative-tests");
const testDataManager = new TestDataManager();

// Helper function para logging detallado de respuestas en tests negativos
function logNegativeResponseDetails(
  response,
  expectedStatus,
  expectedDataStatus,
  testName = ""
) {
  const actualStatus = response.status;
  const actualDataStatus = response.data?.status || "N/A";

  logger.info(
    `🔍 ${testName} - Status HTTP: ${actualStatus}, Data Status: ${actualDataStatus}`
  );

  if (actualStatus !== expectedStatus) {
    logger.info(
      `⚠️ Status inesperado: Esperaba ${expectedStatus}, recibió ${actualStatus}`
    );
  }

  if (actualDataStatus !== expectedDataStatus && expectedDataStatus !== "N/A") {
    logger.info(
      `⚠️ Data Status inesperado: Esperaba '${expectedDataStatus}', recibió '${actualDataStatus}'`
    );
  }

  // Log del mensaje de error si existe
  if (response.data?.data) {
    logger.info(`📝 Mensaje de error: ${response.data.data}`);
  }

  return { actualStatus, actualDataStatus };
}

test.describe("🚫 Tests Negativos - API Cupones", () => {
  let extractedGroupIds = [];
  let existingCouponCodes = [];

  test.beforeAll(async ({ request }) => {
    logger.info("🚫 Iniciando suite de tests negativos para API Cupones");
    const apiClient = new ApiClient(request);

    // Obtener datos reales del sistema para usar en tests negativos
    const response = await apiClient.get("/api/coupon", {
      limit: 50,
      offset: 0,
    });

    if (response.status === 200 && response.data.status === "OK") {
      testDataManager.processCouponsData(response.data);

      // Extraer Group IDs reales para usar en tests
      const rawGroupIds = testDataManager.getAllGroupIds();
      extractedGroupIds = rawGroupIds.map((groupObj) => {
        return typeof groupObj === "object" && groupObj._id
          ? groupObj._id
          : groupObj;
      });

      // Extraer códigos existentes para tests
      existingCouponCodes = testDataManager.getAllCouponCodes();

      logger.info(
        `✅ ${extractedGroupIds.length} Group IDs obtenidos para tests negativos`
      );
      logger.info(
        `📊 ${existingCouponCodes.length} códigos de cupones existentes en el sistema`
      );
    } else {
      logger.info("❌ Error obteniendo datos iniciales para tests negativos");
    }
  });

  // ==================== TESTS DE CREACIÓN NEGATIVA ====================

  test("TC-NEG-001: POST /api/coupon - Error al crear cupón con código duplicado (reutilizable)", async ({
    request,
  }) => {
    logger.info(
      "🧪 Test Negativo: Error al crear cupón reutilizable con código duplicado"
    );

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test

    try {
      // Validar datos necesarios
      if (extractedGroupIds.length === 0) {
        logger.info("⚠️ No hay Group IDs disponibles, saltando test");
        test.skip();
        return;
      }

      const groupId = extractedGroupIds[0];
      const testCode = `DUPLICATE_TEST_${Date.now()}`;

      // Paso 1: Crear cupón inicial
      const initialCouponData = {
        group: groupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "true",
        max_use: "5",
        customer_max_use: "2",
        custom_code: testCode,
        detail: "Test Negativo - Cupón Inicial",
        quantity: "1",
        discount_type: "percent",
        percent: "10",
        type: "ppv-live",
        type_code: "neg_test_initial",
        payment_required: "false",
      };

      logger.info(`🎯 Creando cupón inicial con código: ${testCode}`);
      const initialResponse = await apiClient.post(
        "/api/coupon",
        initialCouponData
      );

      expect(initialResponse.status).toBe(200);
      expect(initialResponse.data.status).toBe("OK");

      const createdCoupon = initialResponse.data.data[0];
      testCouponsToCleanup.push(createdCoupon._id); // Agregar a fixtures para cleanup

      logger.info(
        `✅ Cupón inicial creado: ${createdCoupon.code} (ID: ${createdCoupon._id})`
      );

      // Paso 2: Intentar crear otro cupón con el mismo código
      const duplicateCouponData = {
        group: groupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "true",
        max_use: "3",
        customer_max_use: "1",
        custom_code: testCode, // Usar código duplicado
        detail: "Test Negativo - Intento de Duplicación",
        quantity: "1",
        discount_type: "percent",
        percent: "5",
        type: "ppv-live",
        type_code: "neg_test_duplicate",
        payment_required: "false",
      };

      logger.info(
        `🎯 Intentando crear cupón duplicado con código: ${testCode}`
      );
      const duplicateResponse = await apiClient.post(
        "/api/coupon",
        duplicateCouponData
      );

      // Log detallado de la respuesta
      logNegativeResponseDetails(
        duplicateResponse,
        400,
        "ERROR",
        "POST /api/coupon (código duplicado)"
      );

      // Validar que la API rechaza el código duplicado
      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.data.status).toBe("ERROR");
      expect(duplicateResponse.data.data).toBeDefined();
      expect(duplicateResponse.data.data).toBe("COUPON_CODE_ALREADY_EXISTS");

      logger.info(`✅ ERROR ESPERADO: ${duplicateResponse.data.data}`);
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: Los códigos duplicados se rechazan correctamente en cupones reutilizables"
      );
    } finally {
      // CLEANUP: Limpiar fixtures creadas en este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  test("TC-NEG-002: POST /api/coupon - Comportamiento con código duplicado en cupón no reutilizable", async ({
    request,
  }) => {
    logger.info(
      "🧪 Test Negativo: Comportamiento especial con código duplicado en cupón no reutilizable"
    );

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test

    try {
      // Usar códigos existentes del sistema
      if (existingCouponCodes.length === 0 || extractedGroupIds.length === 0) {
        logger.info("⚠️ No hay datos suficientes, saltando test");
        test.skip();
        return;
      }

      const existingCode = existingCouponCodes[0]; // Código que ya existe en el sistema
      const groupId = extractedGroupIds[0];

      const nonReusableCouponData = {
        group: groupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "false", // NO REUTILIZABLE
        max_use: "1",
        customer_max_use: "1",
        custom_code: existingCode, // Usar código que YA EXISTE
        detail: "Test Negativo - Cupón No Reutilizable con Código Existente",
        quantity: "1",
        discount_type: "percent",
        percent: "15",
        type: "ppv-live",
        type_code: "neg_test_non_reusable",
        payment_required: "false",
      };

      logger.info(
        `🎯 Intentando crear cupón NO REUTILIZABLE con código existente: ${existingCode}`
      );
      logger.info(
        "⚠️ COMPORTAMIENTO ESPERADO: El sistema debería crear un cupón con código diferente (ignora el custom_code)"
      );

      const response = await apiClient.post(
        "/api/coupon",
        nonReusableCouponData
      );

      // Log detallado de la respuesta
      logNegativeResponseDetails(
        response,
        200,
        "OK",
        "POST /api/coupon (no reutilizable, código existente)"
      );

      // VALIDACIÓN ESPECIAL: Para cupones no reutilizables, el sistema NO genera error
      // sino que crea un nuevo cupón con código diferente para evitar duplicidad
      expect(response.status).toBe(200);
      expect(response.data.status).toBe("OK");
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      const createdCoupon = response.data.data[0];
      testCouponsToCleanup.push(createdCoupon._id); // Agregar a fixtures para cleanup

      // VALIDACIÓN CRÍTICA: El código generado debe ser DIFERENTE al solicitado
      expect(createdCoupon.code).not.toBe(existingCode);
      expect(createdCoupon.code).toBeDefined();
      expect(typeof createdCoupon.code).toBe("string");

      logger.info(`✅ COMPORTAMIENTO CORRECTO VALIDADO:`);
      logger.info(`   - Código solicitado: ${existingCode} (duplicado)`);
      logger.info(
        `   - Código generado: ${createdCoupon.code} (nuevo y único)`
      );
      logger.info(`   - ID del cupón: ${createdCoupon._id}`);
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: Para cupones NO REUTILIZABLES, el sistema ignora códigos duplicados y genera uno nuevo"
      );
    } finally {
      // CLEANUP: Limpiar fixtures creadas en este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  test("TC-NEG-003: POST /api/coupon - Error con datos inválidos", async ({
    request,
  }) => {
    logger.info("🧪 Test Negativo: Error con datos inválidos");

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test (aunque no debería crear nada)

    try {
      const invalidCouponData = {
        group: "", // Group ID vacío - debería causar error
        valid_from: "fecha-invalida", // Fecha mal formateada
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "maybe", // Valor inválido para boolean
        max_use: "-1", // Valor negativo
        customer_max_use: "texto", // No es número
        custom_code: "INVALID CODE WITH SPACES AND SPECIAL CHARS!", // Código con espacios y caracteres especiales
        detail: "Test Negativo - Datos Inválidos",
        quantity: "0", // Cantidad cero
        discount_type: "invalid_type", // Tipo de descuento inválido
        amount: "not_a_number", // Monto no numérico
        percent: "150", // Porcentaje mayor a 100
        type: "", // Tipo vacío
        type_code: "", // Type code vacío
        payment_required: "not_boolean", // No es boolean
      };

      logger.info(
        "🎯 Enviando datos completamente inválidos para validar manejo de errores"
      );

      const response = await apiClient.post("/api/coupon", invalidCouponData);

      // Log detallado para errores esperados
      logNegativeResponseDetails(
        response,
        [400, 500],
        "ERROR",
        "POST /api/coupon (datos inválidos)"
      );

      // La API puede devolver 400 o 500 dependiendo del tipo de validación
      expect([400, 500]).toContain(response.status);
      expect(response.data.status).toBe("ERROR");
      expect(response.data.data).toBeDefined();

      logger.info(
        `✅ ERROR ESPERADO con datos inválidos (${response.status}): ${
          response.data.data || "Validation Error"
        }`
      );
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: El sistema rechaza correctamente datos inválidos"
      );
    } finally {
      // CLEANUP: No debería haber fixtures que limpiar para este test
      // pero mantenemos la estructura consistente
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  test("TC-NEG-004: POST /api/coupon - Error con Group ID inexistente", async ({
    request,
  }) => {
    logger.info("🧪 Test Negativo: Error con Group ID que no existe");

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test (aunque no debería crear nada)

    try {
      const nonExistentGroupId = "000000000000000000000000"; // ID que no existe

      const couponDataWithInvalidGroup = {
        group: nonExistentGroupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "true",
        max_use: "5",
        customer_max_use: "2",
        detail: "Test Negativo - Group ID Inexistente",
        quantity: "1",
        discount_type: "percent",
        percent: "10",
        type: "ppv-live",
        type_code: "neg_test_invalid_group",
        payment_required: "false",
      };

      logger.info(
        `🎯 Intentando crear cupón con Group ID inexistente: ${nonExistentGroupId}`
      );

      const response = await apiClient.post(
        "/api/coupon",
        couponDataWithInvalidGroup
      );

      logNegativeResponseDetails(
        response,
        [200, 400, 404],
        "ERROR",
        "POST /api/coupon (Group ID inexistente)"
      );

      // Validar que la API rechaza el Group ID inexistente (puede ser 200 con ERROR, 400 o 404)
      expect([200, 400, 404]).toContain(response.status);
      expect(response.data.status).toBe("ERROR");
      expect(response.data.data).toBeDefined();

      logger.info(
        `✅ ERROR ESPERADO con Group ID inexistente: ${response.data.data}`
      );
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: La API rechaza Group IDs que no existen"
      );
    } finally {
      // CLEANUP: No debería haber fixtures que limpiar para este test
      // pero mantenemos la estructura consistente
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  // ==================== TESTS DE ACTUALIZACIÓN NEGATIVA ====================

  test("TC-NEG-005: POST /api/coupon/{id} - Intento de actualizar con código ya usado (comportamiento silencioso)", async ({
    request,
  }) => {
    logger.info(
      "🧪 Test Negativo: Actualización silenciosa al intentar usar código duplicado"
    );

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test

    try {
      // Verificar que tenemos datos necesarios
      if (existingCouponCodes.length === 0 || extractedGroupIds.length === 0) {
        logger.info("⚠️ No hay datos suficientes, saltando test");
        test.skip();
        return;
      }

      const groupId = extractedGroupIds[0];
      const existingCode = existingCouponCodes[0]; // Código que ya existe en el sistema

      // Paso 1: Crear un cupón que vamos a intentar actualizar
      const initialCouponData = {
        group: groupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-08-31T23:59:59Z",
        is_reusable: "true",
        max_use: "5",
        customer_max_use: "2",
        custom_code: "UPDATE_TEST_ORIGINAL",
        detail: "Test de Actualización - Original",
        quantity: "1",
        discount_type: "percent",
        percent: "10",
        type: "ppv-live",
        type_code: "update_test_original",
        payment_required: "false",
      };

      logger.info("🎯 Creando cupón para test de actualización");
      const createResponse = await apiClient.post(
        "/api/coupon",
        initialCouponData
      );

      expect(createResponse.status).toBe(200);
      expect(createResponse.data.status).toBe("OK");

      const createdCoupon = createResponse.data.data[0];
      testCouponsToCleanup.push(createdCoupon._id); // Agregar a fixtures para cleanup
      const originalCode = createdCoupon.code;

      logger.info(
        `✅ Cupón creado para actualización: ${originalCode} (ID: ${createdCoupon._id})`
      );

      // Paso 2: Intentar actualizar con código existente
      const updateDataWithDuplicateCode = {
        group: groupId,
        valid_from: "2025-08-01T08:00:00Z",
        valid_to: "2025-09-30T23:59:59Z",
        is_reusable: "true",
        max_use: "5",
        customer_max_use: "2",
        custom_code: existingCode, // Intentar usar código ya existente
        detail: "Test Negativo - Actualización con Código Duplicado",
        amount: "20",
        type: "ppv-live",
        type_code: "neg_test_update_duplicate",
        payment_required: "true",
      };

      logger.info(`🎯 Intentando actualizar cupón ${createdCoupon._id}`);
      logger.info(`   - Código actual: ${originalCode}`);
      logger.info(
        `   - Código que se quiere usar: ${existingCode} (YA EXISTE en el sistema)`
      );
      logger.info(
        "⚠️ COMPORTAMIENTO ESPERADO: La API devuelve 200 OK pero mantiene el código original"
      );

      const response = await apiClient.post(
        `/api/coupon/${createdCoupon._id}`,
        updateDataWithDuplicateCode
      );

      logNegativeResponseDetails(
        response,
        200,
        "OK",
        "POST /api/coupon/{id} (código duplicado)"
      );

      // VALIDACIÓN ESPECIAL: La API devuelve 200 OK pero NO actualiza el código
      expect(response.status).toBe(200);
      expect(response.data.status).toBe("OK");
      expect(response.data.data).toBeDefined();

      const updatedCoupon = response.data.data;

      // VALIDACIÓN CRÍTICA: El código NO debe haber cambiado
      expect(updatedCoupon.code).toBe(originalCode);
      expect(updatedCoupon.code).not.toBe(existingCode);
      expect(updatedCoupon._id).toBe(createdCoupon._id);

      // Otras actualizaciones SÍ deben haberse aplicado
      expect(updatedCoupon.detail).toContain("Código Duplicado");
      expect(updatedCoupon.amount).toBe(20);

      logger.info(`✅ COMPORTAMIENTO SILENCIOSO VALIDADO:`);
      logger.info(
        `   - Código solicitado: ${existingCode} (RECHAZADO silenciosamente)`
      );
      logger.info(
        `   - Código actual: ${updatedCoupon.code} (MANTUVO el original)`
      );
      logger.info(
        `   - Otras actualizaciones: SÍ se aplicaron (detail, amount, etc.)`
      );
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: Los códigos duplicados en actualizaciones se rechazan silenciosamente"
      );
    } finally {
      // CLEANUP: Limpiar fixtures creadas en este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  // ==================== TESTS DE CONSULTA NEGATIVA ====================

  test("TC-NEG-006: GET /api/coupon/{id} - Error para cupón inexistente", async ({
    request,
  }) => {
    logger.info("🧪 Test Negativo: Error para cupón inexistente");

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test (no habrá ninguna)

    try {
      const nonExistentId = "000000000000000000000000"; // ID MongoDB que no existe

      logger.info(`🎯 Buscando cupón inexistente con ID: ${nonExistentId}`);

      const response = await apiClient.get(`/api/coupon/${nonExistentId}`);

      logNegativeResponseDetails(
        response,
        200,
        "ERROR",
        "GET /api/coupon/{id} - cupón inexistente"
      );

      // La API devuelve 200 con status ERROR y data null para recursos no encontrados
      expect(response.status).toBe(200);
      expect(response.data.status).toBe("ERROR");
      expect(response.data.data).toBe(null);

      logger.info("✅ ERROR ESPERADO para cupón inexistente: data = null");
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: La API maneja correctamente cupones inexistentes"
      );
    } finally {
      // CLEANUP: No hay fixtures que limpiar para este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  test("TC-NEG-007: GET /api/coupon/{code}/search - Error para código inexistente", async ({
    request,
  }) => {
    logger.info("🧪 Test Negativo: Error para código de cupón inexistente");

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test (no habrá ninguna)

    try {
      const nonExistentCode = "CODIGO_QUE_NO_EXISTE_123";

      logger.info(
        `🎯 Buscando cupón por código inexistente: ${nonExistentCode}`
      );

      const response = await apiClient.get(
        `/api/coupon/${nonExistentCode}/search`
      );

      logNegativeResponseDetails(
        response,
        200,
        "ERROR",
        "GET /api/coupon/{code}/search - código inexistente"
      );

      // La API devuelve 200 con status ERROR y data null para códigos no encontrados
      expect(response.status).toBe(200);
      expect(response.data.status).toBe("ERROR");
      expect(response.data.data).toBe(null);

      logger.info("✅ ERROR ESPERADO para código inexistente: data = null");
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: La API maneja correctamente códigos inexistentes"
      );
    } finally {
      // CLEANUP: No hay fixtures que limpiar para este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });

  test("TC-NEG-008: DELETE /api/coupon/{id} - Error para cupón inexistente", async ({
    request,
  }) => {
    logger.info("🧪 Test Negativo: Error al eliminar cupón inexistente");

    const apiClient = new ApiClient(request);
    const testCouponsToCleanup = []; // Fixtures para este test (no habrá ninguna)

    try {
      const nonExistentId = "000000000000000000000000"; // ID MongoDB que no existe

      logger.info(
        `🎯 Intentando eliminar cupón inexistente con ID: ${nonExistentId}`
      );

      const response = await apiClient.delete(`/api/coupon/${nonExistentId}`);

      logNegativeResponseDetails(
        response,
        [200, 404],
        "ERROR",
        "DELETE /api/coupon/{id} - cupón inexistente"
      );

      // La API puede devolver 200 con ERROR o 404 directamente
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data.status).toBe("ERROR");
        expect(response.data.data).toBeDefined();
      }

      logger.info(
        `✅ ERROR ESPERADO para eliminación de cupón inexistente (${response.status})`
      );
      logger.info(
        "🔒 VALIDACIÓN EXITOSA: La API maneja correctamente intentos de eliminar cupones inexistentes"
      );
    } finally {
      // CLEANUP: No hay fixtures que limpiar para este test
      for (const couponId of testCouponsToCleanup) {
        try {
          await apiClient.delete(`/api/coupon/${couponId}`);
          logger.info(`🧹 Fixture eliminada: ${couponId}`);
        } catch (error) {
          logger.info(
            `⚠️ Error limpiando fixture ${couponId}: ${error.message}`
          );
        }
      }
    }
  });
});
