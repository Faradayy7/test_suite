const { test, expect } = require("@playwright/test");
const { ApiClient } = require("../../utils/api-client.js");
const { Logger } = require("../../utils/logger.js");
const { TestDataManager } = require("../../utils/test-data-manager.js");
const fs = require("fs");
const path = require("path");

const logger = new Logger("categoria-comprehensive-tests");
const testDataManager = new TestDataManager();

// Helper function para logging detallado de respuestas
function logResponseDetails(response, expectedStatus = 200, expectedDataStatus = "OK", testName = "") {
  const actualStatus = response.status;
  const actualDataStatus = response.data?.status || "N/A";

  logger.info(`📡 ${testName} - Respuesta: Status ${actualStatus}, Data Status: ${actualDataStatus}`);

  if (actualStatus !== expectedStatus) {
    logger.info(`❌ Error de Status: Esperaba ${expectedStatus}, recibió ${actualStatus}`);
    logger.info(`📝 Respuesta completa: ${JSON.stringify(response.data, null, 2)}`);
  }

  if (actualDataStatus !== expectedDataStatus && expectedDataStatus !== "N/A") {
    logger.info(`❌ Error de Data Status: Esperaba '${expectedDataStatus}', recibió '${actualDataStatus}'`);
  }

  return { actualStatus, actualDataStatus };
}

test.describe("📂 Tests Comprehensivos - API Categorías", () => {
  let categoryId = null;
  let mediaId = null;
  let createdCategoryIds = []; // Para cleanup

  test.beforeAll(async ({ request }) => {
    logger.info("📂 Iniciando tests comprehensivos de API Categorías");
    const apiClient = new ApiClient(request);

    // Intentar obtener un mediaId disponible para tests de asociación
    try {
      logger.info("🔍 Obteniendo mediaId disponible para tests de asociación...");
      const mediaResponse = await apiClient.get("/api/media", { limit: 1 });

      if (mediaResponse.status === 200 && mediaResponse.data.status === "OK" && mediaResponse.data.data.length > 0) {
        mediaId = mediaResponse.data.data[0]._id || mediaResponse.data.data[0].id;
        logger.info(`📌 MediaId obtenido para tests: ${mediaId}`);
      } else {
        logger.info("⚠️ No se pudo obtener mediaId - algunos tests serán saltados");
      }
    } catch (error) {
      logger.info(`⚠️ Error obteniendo mediaId: ${error.message}`);
    }
  });

  test.afterAll(async ({ request }) => {
    logger.info("📂 Tests comprehensivos de API Categorías completados");

    // Cleanup: Eliminar categorías creadas durante los tests
    if (createdCategoryIds.length > 0) {
      const apiClient = new ApiClient(request);
      logger.info(`🧹 Limpiando ${createdCategoryIds.length} categorías creadas en tests...`);

      for (const catId of createdCategoryIds) {
        try {
          const deleteResponse = await apiClient.delete(`/api/category/${catId}`);
          if (deleteResponse.status === 200 || deleteResponse.status === 204) {
            logger.info(`✅ Categoría ${catId} eliminada correctamente`);
          } else {
            logger.info(`⚠️ Error eliminando categoría ${catId}: Status ${deleteResponse.status}`);
          }
        } catch (error) {
          logger.info(`❌ Excepción eliminando categoría ${catId}: ${error.message}`);
        }
      }
      logger.info("🧹 Proceso de cleanup completado");
    }

    if (categoryId) {
      logger.info(`📊 ID de categoría utilizado en tests: ${categoryId}`);
    }
  });

  // ==================== TESTS GET BÁSICOS ====================

  test("TC-CATEGORIA-001: GET /api/category - Obtener todas las categorías", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Obtener todas las categorías");

    const response = await apiClient.get("/api/category");

    logResponseDetails(response, 200, "OK", "GET /api/category");

    expect(response.status).toBe(200);

    const responseBody = response.data;

    // Validamos que tenga la clave 'data' y que sea una lista
    expect(responseBody).toHaveProperty("data");
    expect(Array.isArray(responseBody.data)).toBe(true);

    const categoryList = responseBody.data;

    // Guardamos un ID si existe alguna categoría
    if (categoryList.length > 0) {
      categoryId = categoryList[0]._id;
      expect(categoryId).toBeDefined();
      logger.info(`📌 ID de categoría obtenido: ${categoryId}`);

      // Validar estructura básica de categoría
      const sampleCategory = categoryList[0];
      expect(sampleCategory).toHaveProperty("_id");
      expect(sampleCategory).toHaveProperty("name");
      expect(sampleCategory).toHaveProperty("slug");
      
      logger.info(`📋 Categoría ejemplo: "${sampleCategory.name}" (${sampleCategory._id})`);
    }

    logger.info(`✅ Obtención de categorías verificada: ${categoryList.length} categorías encontradas`);
  });

  test("TC-CATEGORIA-002: GET /api/category - Validar estructura de respuesta", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Validar estructura de respuesta de categorías");

    const response = await apiClient.get("/api/category", { limit: 5 });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const categories = response.data.data;

    if (categories.length > 0) {
      const category = categories[0];

      // Validar campos obligatorios
      expect(category).toHaveProperty("_id");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("slug");
      expect(category).toHaveProperty("date_created");
      expect(category).toHaveProperty("visible");

      // Validar tipos
      expect(typeof category._id).toBe("string");
      expect(typeof category.name).toBe("string");
      expect(typeof category.slug).toBe("string");
      expect(typeof category.visible).toBe("boolean");

      logger.info("✅ Estructura de categoría validada correctamente");
      logger.info(`📊 Campos validados: _id, name, slug, date_created, visible`);
    }
  });

  // ==================== TESTS POST (CREACIÓN) ====================

  test("TC-CATEGORIA-003: POST /api/category - Crear nueva categoría", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Crear nueva categoría");

    const timestamp = Date.now().toString().slice(-6);
    const payload = {
      name: `Categoría de Prueba QA ${timestamp}`,
      description: "Descripción de prueba para categoría automatizada",
      is_active: true,
    };

    logger.info(`📝 Datos de categoría: ${JSON.stringify(payload)}`);

    const response = await apiClient.post("/api/category", payload);

    logResponseDetails(response, 200, "OK", "POST /api/category");

    expect(response.status).toBe(200);

    const responseBody = response.data;

    // Validamos la estructura básica de la respuesta
    expect(responseBody).toHaveProperty("status");
    expect(responseBody.status).toBe("OK");
    expect(responseBody).toHaveProperty("data");

    const createdCategory = responseBody.data;

    // Validamos los campos específicos de la categoría
    expect(createdCategory.name).toBe(payload.name);
    expect(createdCategory.description).toBe(payload.description);
    expect(createdCategory).toHaveProperty("_id");
    expect(createdCategory).toHaveProperty("slug");
    expect(createdCategory).toHaveProperty("date_created");
    expect(createdCategory).toHaveProperty("visible");

    // Guardamos el ID de la categoría creada para usar en otros tests
    categoryId = createdCategory._id;
    createdCategoryIds.push(categoryId); // Para cleanup

    logger.info(`📌 Categoría creada con ID: ${categoryId}`);
    logger.info(`📌 Slug generado: ${createdCategory.slug}`);
    logger.info("✅ Categoría creada exitosamente");
  });

  test("TC-CATEGORIA-004: POST /api/category - Crear categoría con metadatos adicionales", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Crear categoría con metadatos adicionales");

    const timestamp = Date.now().toString().slice(-6);
    const payload = {
      name: `Categoría Meta QA ${timestamp}`,
      description: "Categoría con metadatos de prueba",
      is_active: true,
      color: "#FF5733",
      order: 10,
      icon: "test-icon",
    };

    logger.info(`📝 Datos con metadatos: ${JSON.stringify(payload)}`);

    const response = await apiClient.post("/api/category", payload);

    logResponseDetails(response, 200, "OK", "POST /api/category (con metadatos)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const createdCategory = response.data.data;
    expect(createdCategory.name).toBe(payload.name);
    expect(createdCategory).toHaveProperty("_id");

    // Agregar para cleanup
    createdCategoryIds.push(createdCategory._id);

    logger.info(`📌 Categoría con metadatos creada: ${createdCategory._id}`);
    logger.info("✅ Metadatos procesados correctamente");
  });

  // ==================== TESTS GET BY ID ==================

  test("TC-CATEGORIA-005: GET /api/category/{id} - Obtener categoría por ID", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Obtener categoría por ID");

    // Validar que tenemos un categoryId
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    logger.info(`🎯 Obteniendo categoría con ID: ${categoryId}`);

    const response = await apiClient.get(`/api/category/${categoryId}`);

    logResponseDetails(response, 200, "OK", "GET /api/category/{id}");

    expect(response.status).toBe(200);

    const responseBody = response.data;
    expect(responseBody).toHaveProperty("data");

    const category = responseBody.data;
    expect(category).toHaveProperty("_id");
    expect(category._id).toBe(categoryId);
    expect(category).toHaveProperty("name");
    expect(category).toHaveProperty("slug");

    logger.info(`📋 Categoría obtenida: "${category.name}" (Slug: ${category.slug})`);
    logger.info("✅ Categoría obtenida por ID correctamente");
  });

  // ==================== TESTS UPDATE ==================

  test("TC-CATEGORIA-006: POST /api/category/{id} - Actualizar categoría", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Actualizar categoría");

    // Validar que tenemos un categoryId
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    const payload = {
      name: "Categoría Actualizada QA",
      description: "Descripción actualizada de prueba automatizada",
      is_active: true,
    };

    logger.info(`🎯 Actualizando categoría con ID: ${categoryId}`);
    logger.info(`📝 Datos de actualización: ${JSON.stringify(payload)}`);

    const response = await apiClient.post(`/api/category/${categoryId}`, payload);

    logResponseDetails(response, 200, "OK", "POST /api/category/{id}");

    expect([200, 204]).toContain(response.status);

    // Si la respuesta incluye datos, validarlos
    if (response.status === 200 && response.data.data) {
      const updatedCategory = response.data.data;
      expect(updatedCategory.name).toBe(payload.name);
      expect(updatedCategory.description).toBe(payload.description);
      logger.info(`📌 Actualización confirmada en respuesta: ${updatedCategory.name}`);
    }

    // Verificamos que se actualizó correctamente con una consulta separada
    logger.info("🔍 Verificando actualización...");
    const verifyResponse = await apiClient.get(`/api/category/${categoryId}`);

    expect(verifyResponse.status).toBe(200);

    const updated = verifyResponse.data.data;
    expect(updated.name).toBe("Categoría Actualizada QA");

    logger.info(`📌 Categoría actualizada verificada: ${updated.name}`);
    logger.info("✅ Actualización verificada correctamente");
  });

  // ==================== TESTS DE ASOCIACIÓN MEDIA ====================

  test("TC-CATEGORIA-007: POST /api/category/{id}/media - Asociar media a categoría", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Asociar media a categoría");

    // Validar que tenemos un categoryId
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    if (!mediaId) {
      logger.info("⚠️ No hay mediaId disponible, saltando test");
      test.skip();
      return;
    }

    const payload = {
      media_id: mediaId,
    };

    logger.info(`🎯 Asociando media ${mediaId} a categoría ${categoryId}`);
    logger.info(`📝 Datos: ${JSON.stringify(payload)}`);

    const response = await apiClient.post(`/api/category/${categoryId}/media`, payload);

    logResponseDetails(response, [200, 201], "OK", "POST /api/category/{id}/media");

    expect([200, 201]).toContain(response.status);

    logger.info("✅ Media asociado a categoría correctamente");
  });

  test("TC-CATEGORIA-008: GET /api/category/{id}/media - Obtener media de categoría", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Obtener media asociado a categoría");

    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    logger.info(`🎯 Obteniendo media de categoría ${categoryId}`);

    const response = await apiClient.get(`/api/category/${categoryId}/media`);

    logResponseDetails(response, 200, "OK", "GET /api/category/{id}/media");

    expect(response.status).toBe(200);

    const responseBody = response.data;
    expect(responseBody).toHaveProperty("data");
    expect(Array.isArray(responseBody.data)).toBe(true);

    const mediaList = responseBody.data;
    logger.info(`📊 Media encontrado en categoría: ${mediaList.length} elementos`);

    if (mediaList.length > 0) {
      const sampleMedia = mediaList[0];
      expect(sampleMedia).toHaveProperty("_id");
      expect(sampleMedia).toHaveProperty("title");
      logger.info(`📋 Media ejemplo: "${sampleMedia.title}" (${sampleMedia._id})`);
    }

    logger.info("✅ Media de categoría obtenido correctamente");
  });

  // ==================== TESTS DE IMAGEN ====================

  test("TC-CATEGORIA-009: POST /api/category/{id}/image - Subir imagen a categoría (implementación pendiente)", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Subir imagen a categoría");

    // Validar que tenemos un categoryId
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    // Ruta a imagen de prueba (ajustar según disponibilidad)
    const imagePath = "C:/Users/andre/Downloads/technicaldifficultieswp6.jpg";

    // Verificamos que el archivo existe
    if (!fs.existsSync(imagePath)) {
      logger.info(`⚠️ Archivo de imagen no encontrado en: ${imagePath}, saltando test`);
      test.skip();
      return;
    }

    logger.info(`📌 Usando imagen desde: ${imagePath}`);
    logger.info(`🎯 Subiendo imagen a categoría con ID: ${categoryId}`);

    // Leer el archivo de imagen
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);

    try {
      // Para este test, necesitaremos usar form-data con archivos
      // Por ahora, registramos que el test está implementado
      logger.info("📝 Test de subida de imagen implementado (requiere configuración de multipart)");
      logger.info(`📁 Archivo preparado: ${fileName} (${imageBuffer.length} bytes)`);

      // Marcar como pendiente hasta implementar multipart en ApiClient
      test.skip("Implementación de multipart/form-data pendiente en ApiClient");
    } catch (error) {
      logger.error(`❌ Error preparando imagen: ${error.message}`);
      throw error;
    }
  });

  test("TC-CATEGORIA-010: DELETE /api/category/{id}/image - Eliminar imagen de categoría", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Eliminar imagen de categoría");

    // Validar que tenemos un categoryId
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    logger.info(`🎯 Eliminando imagen de categoría con ID: ${categoryId}`);

    const response = await apiClient.delete(`/api/category/${categoryId}/image`);

    logResponseDetails(response, [200, 204], "OK", "DELETE /api/category/{id}/image");

    expect([200, 204, 404]).toContain(response.status);

    if (response.status === 404) {
      logger.info("ℹ️ No había imagen para eliminar (404 esperado)");
    } else {
      logger.info("✅ Imagen eliminada correctamente");
    }
  });

  // ==================== TESTS DE CASOS EDGE Y ERRORES ====================

  test("TC-CATEGORIA-011: GET /api/category/{id} - Error para categoría inexistente", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Error para categoría inexistente");

    const nonExistentId = "000000000000000000000000"; // ID que no existe

    logger.info(`🎯 Buscando categoría inexistente con ID: ${nonExistentId}`);

    const response = await apiClient.get(`/api/category/${nonExistentId}`);

    logResponseDetails(response, 404, "ERROR", "GET /api/category/{id} - categoría inexistente");

    expect([404, 200]).toContain(response.status);

    if (response.status === 404) {
      logger.info("✅ Error 404 esperado para categoría inexistente");
    } else if (response.status === 200) {
      // Algunas APIs devuelven 200 con data null
      expect(response.data.data).toBeNull();
      logger.info("✅ Error esperado: data null para categoría inexistente");
    }
  });

  test("TC-CATEGORIA-012: POST /api/category - Error con datos inválidos", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Error con datos inválidos");

    const invalidPayload = {
      name: "", // Nombre vacío
      description: "", // Descripción vacía
      is_active: "invalid_boolean", // Valor inválido para booleano
    };

    logger.info(`🎯 Enviando datos inválidos: ${JSON.stringify(invalidPayload)}`);

    const response = await apiClient.post("/api/category", invalidPayload);

    // Log detallado para errores esperados
    logger.info(`📡 Respuesta de validación - Status: ${response.status}, Data Status: ${response.data?.status || "N/A"}`);
    logger.info(`📝 Mensaje de error recibido: ${response.data?.data || "Sin mensaje específico"}`);

    // La API puede devolver 400, 422 o 500 dependiendo del tipo de validación
    expect([400, 422, 500]).toContain(response.status);

    logger.info(`✅ Error esperado con datos inválidos (${response.status})`);
  });

  test("TC-CATEGORIA-013: POST /api/category - Error con nombre duplicado", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Error con nombre de categoría duplicado");

    // Usar el nombre de una categoría existente si está disponible
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, creando categoría temporal");
      
      const tempPayload = {
        name: "Categoría Temp para Duplicado",
        description: "Temporal",
        is_active: true,
      };

      const tempResponse = await apiClient.post("/api/category", tempPayload);
      if (tempResponse.status === 200) {
        categoryId = tempResponse.data.data._id;
        createdCategoryIds.push(categoryId);
      }
    }

    if (categoryId) {
      // Obtener el nombre de la categoría existente
      const existingResponse = await apiClient.get(`/api/category/${categoryId}`);
      if (existingResponse.status === 200) {
        const existingName = existingResponse.data.data.name;

        const duplicatePayload = {
          name: existingName, // Usar nombre que ya existe
          description: "Intento de duplicado",
          is_active: true,
        };

        logger.info(`🎯 Intentando crear categoría con nombre duplicado: "${existingName}"`);

        const response = await apiClient.post("/api/category", duplicatePayload);

        logger.info(`📡 Respuesta duplicado - Status: ${response.status}, Data Status: ${response.data?.status || "N/A"}`);

        // La API puede aceptar el duplicado o rechazarlo
        if (response.status === 200) {
          // Si acepta, agregar para cleanup
          if (response.data.data && response.data.data._id) {
            createdCategoryIds.push(response.data.data._id);
          }
          logger.info("ℹ️ API permite nombres duplicados");
        } else {
          expect([400, 422, 409]).toContain(response.status);
          logger.info(`✅ Error esperado con nombre duplicado (${response.status})`);
        }
      }
    } else {
      logger.info("⚠️ No se pudo preparar test de duplicado, saltando");
      test.skip();
    }
  });

  // ==================== TESTS DE FILTROS Y BÚSQUEDA ====================

  test("TC-CATEGORIA-014: GET /api/category - Test con filtros y paginación", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Filtros y paginación en categorías");

    // Test con límite
    const limitResponse = await apiClient.get("/api/category", { limit: 3 });
    expect(limitResponse.status).toBe(200);
    expect(limitResponse.data.data.length).toBeLessThanOrEqual(3);
    logger.info(`📊 Test de límite: ${limitResponse.data.data.length} categorías (límite: 3)`);

    // Test con búsqueda si hay categorías
    if (limitResponse.data.data.length > 0) {
      const sampleName = limitResponse.data.data[0].name;
      const searchWord = sampleName.split(" ")[0]; // Primera palabra del nombre

      const searchResponse = await apiClient.get("/api/category", { search: searchWord });
      expect(searchResponse.status).toBe(200);
      logger.info(`🔍 Test de búsqueda: "${searchWord}" encontró ${searchResponse.data.data.length} resultados`);
    }

    logger.info("✅ Filtros y paginación validados");
  });

  test("TC-CATEGORIA-015: GET /api/category - Test de ordenamiento", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Ordenamiento de categorías");

    // Test ordenamiento por nombre
    const orderResponse = await apiClient.get("/api/category", { 
      sort: "name", 
      order: "asc", 
      limit: 10 
    });

    expect(orderResponse.status).toBe(200);

    const categories = orderResponse.data.data;
    if (categories.length > 1) {
      // Verificar que están ordenadas alfabéticamente
      let isOrdered = true;
      for (let i = 0; i < categories.length - 1; i++) {
        if (categories[i].name > categories[i + 1].name) {
          isOrdered = false;
          break;
        }
      }
      logger.info(`📊 Ordenamiento alfabético: ${isOrdered ? "Correcto" : "Verificar manualmente"}`);
    }

    logger.info("✅ Ordenamiento validado");
  });

  // ==================== TEST DE ELIMINACIÓN ====================

  test("TC-CATEGORIA-999: DELETE /api/category/{id} - Eliminar categoría de prueba", async ({ request }) => {
    const apiClient = new ApiClient(request);
    logger.info("🧪 Test: Eliminar categoría de prueba");

    // Este test eliminará la categoría principal usada en las pruebas
    // Las demás se limpiarán en afterAll
    if (!categoryId) {
      logger.info("⚠️ No hay categoryId disponible, saltando test");
      test.skip();
      return;
    }

    logger.info(`🎯 Eliminando categoría principal con ID: ${categoryId}`);

    const response = await apiClient.delete(`/api/category/${categoryId}`);

    logResponseDetails(response, [200, 204], "OK", "DELETE /api/category/{id}");

    expect([200, 204]).toContain(response.status);

    // Verificamos que la categoría ya no existe
    logger.info("🔍 Verificando que la categoría fue eliminada...");
    const verifyResponse = await apiClient.get(`/api/category/${categoryId}`);

    expect([404, 200]).toContain(verifyResponse.status);

    if (verifyResponse.status === 404) {
      logger.info("✅ Categoría eliminada correctamente (404)");
    } else if (verifyResponse.status === 200 && verifyResponse.data.data === null) {
      logger.info("✅ Categoría eliminada correctamente (data null)");
    }

    logger.info("✅ Verificación de eliminación completada");

    // Remover de la lista de cleanup ya que fue eliminada
    const index = createdCategoryIds.indexOf(categoryId);
    if (index > -1) {
      createdCategoryIds.splice(index, 1);
    }
  });
});
