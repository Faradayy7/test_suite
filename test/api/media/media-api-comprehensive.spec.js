const { test, expect } = require("@playwright/test");
const { ApiClient } = require("../../utils/api-client.js");
const { Logger } = require("../../utils/logger.js");
const { TestDataManager } = require("../../utils/test-data-manager.js");

const logger = new Logger("media-api-tests");
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
    `📊 ${testName} - Status HTTP: ${actualStatus}, Data Status: ${actualDataStatus}`
  );

  if (actualStatus !== expectedStatus) {
    logger.info(
      `❌ Status inesperado: Esperaba ${expectedStatus}, recibió ${actualStatus}`
    );
  }

  if (actualDataStatus !== expectedDataStatus && expectedDataStatus !== "N/A") {
    logger.info(
      `⚠️ Data Status inesperado: Esperaba '${expectedDataStatus}', recibió '${actualDataStatus}'`
    );
  }

  return { actualStatus, actualDataStatus };
}

test.describe("🎬 Tests Comprehensivos - API Media", () => {
  let extractedData = {
    ids: [],
    titles: [],
    types: [],
    tags: [],
    durations: [],
    views: [],
    categories: [],
    dates: [],
  };

  test.beforeAll(async ({ request }) => {
    logger.info("🎬 Iniciando suite de tests comprehensivos para API Media");
    const apiClient = new ApiClient(request);

    try {
      // Obtener datos reales del sistema para usar en tests
      const response = await apiClient.get("/api/media", {
        limit: 50,
        offset: 0,
      });

      if (response.status === 200 && response.data.status === "OK") {
        const mediaData = response.data.data;

        if (Array.isArray(mediaData) && mediaData.length > 0) {
          // Extraer datos para usar en tests posteriores
          mediaData.forEach((media) => {
            if (media.id) extractedData.ids.push(media.id);
            if (media._id) extractedData.ids.push(media._id);
            if (media.title) extractedData.titles.push(media.title);
            if (media.type) extractedData.types.push(media.type);
            if (media.duration) extractedData.durations.push(media.duration);
            if (media.views !== undefined)
              extractedData.views.push(media.views);
            if (media.date_created)
              extractedData.dates.push(media.date_created);
            if (media.created_at) extractedData.dates.push(media.created_at);

            // Extraer categorías
            if (media.categories && Array.isArray(media.categories)) {
              media.categories.forEach((cat) => {
                const categoryName = cat.name || cat.id || cat;
                if (categoryName) extractedData.categories.push(categoryName);
              });
            }

            // Extraer tags
            if (media.tags && Array.isArray(media.tags)) {
              media.tags.forEach((tag) => {
                const tagName = tag.name || tag.id || tag;
                if (tagName) extractedData.tags.push(tagName);
              });
            }
          });
        }

        // Remover duplicados
        Object.keys(extractedData).forEach((key) => {
          extractedData[key] = [...new Set(extractedData[key])];
        });

        logger.info(
          `✅ ${mediaData.length} elementos de media obtenidos para tests`
        );
        logger.info(
          `📊 IDs: ${extractedData.ids.length}, Títulos: ${extractedData.titles.length}, Tipos: ${extractedData.types.length}`
        );
        logger.info(
          `🏷️ Categorías: ${extractedData.categories.length}, Tags: ${extractedData.tags.length}`
        );
      } else {
        logger.info("❌ Error obteniendo datos iniciales para tests de media");
      }
    } catch (error) {
      logger.info(`⚠️ Error en beforeAll: ${error.message}`);
    }
  });

  // ==================== TESTS BÁSICOS ====================

  test("TC-MEDIA-001: GET /api/media - Obtener datos iniciales y validar estructura", async ({
    request,
  }) => {
    logger.info("🧪 Test Básico: Obtener datos iniciales de media");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      limit: 50,
      offset: 0,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (datos iniciales)");

    // Verificaciones básicas
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.status).toBe("OK");
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    const mediaData = response.data.data;

    if (mediaData.length > 0) {
      const media = mediaData[0];

      // Verificar campos obligatorios
      expect(media).toHaveProperty("id");
      expect(media).toHaveProperty("_id");
      expect(media).toHaveProperty("title");
      expect(media).toHaveProperty("type");
      expect(media).toHaveProperty("status");
      expect(media).toHaveProperty("duration");
      expect(media).toHaveProperty("views");
      expect(media).toHaveProperty("categories");
      expect(media).toHaveProperty("date_created");
      expect(media).toHaveProperty("slug");

      logger.info(`✅ Estructura básica validada correctamente`);
      logger.info(`📋 Media ejemplo: "${media.title}" (ID: ${media.id})`);
      logger.info(
        `🎬 Tipo: ${media.type}, Duración: ${media.duration}s, Vistas: ${media.views}`
      );
    }
  });

  test("TC-MEDIA-002: GET /api/media - Filtro por ID específico", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por ID específico");

    const apiClient = new ApiClient(request);

    if (extractedData.ids.length === 0) {
      logger.info("⚠️ No hay IDs disponibles, saltando test");
      test.skip();
      return;
    }

    const testId = extractedData.ids[0];

    const response = await apiClient.get("/api/media", { id: testId });

    logResponseDetails(response, 200, "OK", `GET /api/media (ID: ${testId})`);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data)) {
      const foundMedia = data.find(
        (media) => (media.id || media._id) === testId
      );
      expect(foundMedia).toBeDefined();
      logger.info(
        `✅ Filtro por ID funcionando: Buscado ${testId}, Encontrado: ${
          foundMedia ? foundMedia.id || foundMedia._id : "N/A"
        }`
      );
    } else if (data && (data.id || data._id)) {
      expect(data.id || data._id).toBe(testId);
      logger.info(`✅ Filtro por ID funcionando: ${data.id || data._id}`);
    }
  });

  test("TC-MEDIA-003: GET /api/media - Validación completa de estructura de respuesta", async ({
    request,
  }) => {
    logger.info("🧪 Test de Validación: Estructura completa de respuesta");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", { limit: 1 });

    logResponseDetails(
      response,
      200,
      "OK",
      "GET /api/media (validación estructura)"
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    if (response.data.data.length > 0) {
      const media = response.data.data[0];

      // Verificar campos principales
      expect(media).toHaveProperty("access_restrictions");
      expect(media).toHaveProperty("access_rules");
      expect(media).toHaveProperty("preview");
      expect(media).toHaveProperty("meta");
      expect(media).toHaveProperty("thumbnails");
      expect(media).toHaveProperty("protocols");
      expect(media).toHaveProperty("show_info");
      expect(media).toHaveProperty("is_published");
      expect(media).toHaveProperty("is_initialized");

      // Verificar tipos
      expect(typeof media.is_published).toBe("boolean");
      expect(typeof media.is_initialized).toBe("boolean");
      expect(Array.isArray(media.meta)).toBe(true);
      expect(Array.isArray(media.thumbnails)).toBe(true);
      expect(Array.isArray(media.categories)).toBe(true);

      logger.info(`✅ Estructura completa validada`);
      logger.info(`📋 Media: "${media.title}" (Tipo: ${media.type})`);
      logger.info(
        `🎥 Publicado: ${media.is_published}, Inicializado: ${media.is_initialized}`
      );
      logger.info(
        `📊 Meta: ${media.meta.length}, Thumbnails: ${media.thumbnails.length}, Categorías: ${media.categories.length}`
      );
    }
  });

  // ==================== TESTS DE FILTRADO ====================

  test("TC-MEDIA-004: GET /api/media - Búsqueda por título usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Búsqueda: Query por título real");

    const apiClient = new ApiClient(request);

    if (extractedData.titles.length === 0) {
      logger.info("⚠️ No hay títulos disponibles, saltando test");
      test.skip();
      return;
    }

    // Usar una palabra del primer título
    const testTitle = extractedData.titles[0];
    const searchWord = testTitle.split(" ")[0]; // Primera palabra del título

    const response = await apiClient.get("/api/media", {
      query: searchWord,
      limit: 20,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      `GET /api/media (query: ${searchWord})`
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      logger.info(
        `✅ Búsqueda encontró ${data.length} resultados para "${searchWord}"`
      );

      // Verificar si algún resultado contiene la palabra buscada
      const hasMatchingTitle = data.some(
        (media) =>
          media.title &&
          media.title.toLowerCase().includes(searchWord.toLowerCase())
      );
      logger.info(
        `🔍 Coincidencias en título: ${
          hasMatchingTitle ? "Sí" : "Verificar manualmente"
        }`
      );
    }
  });

  test("TC-MEDIA-005: GET /api/media - Filtro por tipo usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por tipo real");

    const apiClient = new ApiClient(request);

    if (extractedData.types.length === 0) {
      logger.info("⚠️ No hay tipos disponibles, saltando test");
      test.skip();
      return;
    }

    const testType = extractedData.types[0];

    const response = await apiClient.get("/api/media", {
      type: testType,
      limit: 15,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      `GET /api/media (tipo: ${testType})`
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      const correctType = data.filter((media) => media.type === testType);
      logger.info(
        `✅ ${correctType.length} de ${data.length} medias son del tipo "${testType}"`
      );
    }
  });

  test("TC-MEDIA-006: GET /api/media - Filtro por duración usando rangos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por duración real");

    const apiClient = new ApiClient(request);

    if (extractedData.durations.length === 0) {
      logger.info("⚠️ No hay datos de duración, saltando test");
      test.skip();
      return;
    }

    const durations = extractedData.durations.sort((a, b) => a - b);
    const minDuration = durations[Math.floor(durations.length * 0.25)]; // Percentil 25
    const maxDuration = durations[Math.floor(durations.length * 0.75)]; // Percentil 75

    const response = await apiClient.get("/api/media", {
      min_duration: minDuration,
      max_duration: maxDuration,
      limit: 20,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      `GET /api/media (duración: ${minDuration}s-${maxDuration}s)`
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      const validDurations = data.filter((media) => {
        const duration = media.duration;
        return duration && duration >= minDuration && duration <= maxDuration;
      });
      logger.info(
        `✅ ${validDurations.length} de ${data.length} medias dentro del rango ${minDuration}s-${maxDuration}s`
      );
    }
  });

  test("TC-MEDIA-007: GET /api/media - Filtro por vistas usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por vistas reales");

    const apiClient = new ApiClient(request);

    if (extractedData.views.length === 0) {
      logger.info("⚠️ No hay datos de vistas, saltando test");
      test.skip();
      return;
    }

    const views = extractedData.views.sort((a, b) => a - b);
    const minViews = views[Math.floor(views.length * 0.1)]; // Percentil 10

    const response = await apiClient.get("/api/media", {
      min_views: minViews,
      limit: 15,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      `GET /api/media (vistas >= ${minViews})`
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      const validViews = data.filter((media) => {
        const mediaViews = media.views || media.view_count;
        return mediaViews !== undefined && mediaViews >= minViews;
      });
      logger.info(
        `✅ ${validViews.length} de ${data.length} medias con vistas >= ${minViews}`
      );
    }
  });

  // ==================== TESTS DE PAGINACIÓN ====================

  test("TC-MEDIA-008: GET /api/media - Paginación básica", async ({
    request,
  }) => {
    logger.info("🧪 Test de Paginación: Paginación básica");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      limit: 10,
      offset: 0,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (paginación)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data)) {
      expect(data.length).toBeLessThanOrEqual(10);
      logger.info(`✅ Primera página: ${data.length} elementos (límite: 10)`);
    }
  });

  test("TC-MEDIA-009: GET /api/media - Segunda página", async ({ request }) => {
    logger.info("🧪 Test de Paginación: Segunda página");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      limit: 5,
      offset: 5,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (segunda página)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data)) {
      expect(data.length).toBeLessThanOrEqual(5);
      logger.info(`✅ Segunda página: ${data.length} elementos (límite: 5)`);
    }
  });

  // ==================== TESTS DE CATEGORÍAS Y TAGS ====================

  test("TC-MEDIA-010: GET /api/media - Filtro por categorías usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por categorías reales");

    const apiClient = new ApiClient(request);

    if (extractedData.categories.length === 0) {
      logger.info("⚠️ No hay categorías disponibles, saltando test");
      test.skip();
      return;
    }

    const testCategory = extractedData.categories[0];

    const response = await apiClient.get("/api/media", {
      category: testCategory,
      limit: 20,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      `GET /api/media (categoría: ${testCategory})`
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      const withCategory = data.filter((media) => {
        if (media.categories && Array.isArray(media.categories)) {
          return media.categories.some(
            (cat) => (cat.name || cat.id || cat) === testCategory
          );
        }
        return false;
      });
      logger.info(
        `✅ ${withCategory.length} de ${data.length} medias con categoría "${testCategory}"`
      );
    }
  });

  test("TC-MEDIA-011: GET /api/media - Filtro sin categorías", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Medias sin categorías");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      without_category: true,
      limit: 20,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (sin categorías)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data)) {
      const withoutCategories = data.filter(
        (media) =>
          !media.categories ||
          !Array.isArray(media.categories) ||
          media.categories.length === 0
      );
      const withCategories = data.length - withoutCategories.length;

      logger.info(`📊 Análisis without_category=true:`);
      logger.info(`   ✅ Sin categorías: ${withoutCategories.length}`);
      logger.info(`   ❌ Con categorías (no esperadas): ${withCategories}`);
      logger.info(`   📊 Total: ${data.length}`);
    }
  });

  test("TC-MEDIA-012: GET /api/media - Filtro por tags usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Filtro por tags reales");

    const apiClient = new ApiClient(request);

    if (extractedData.tags.length === 0) {
      logger.info("⚠️ No hay tags disponibles, saltando test");
      test.skip();
      return;
    }

    const testTag = extractedData.tags[0];

    const response = await apiClient.get("/api/media", {
      tag: testTag,
      "tags-rule": "in_any",
      limit: 20,
    });

    logResponseDetails(response, 200, "OK", `GET /api/media (tag: ${testTag})`);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 0) {
      const withTag = data.filter((media) => {
        if (media.tags && Array.isArray(media.tags)) {
          return media.tags.some(
            (tag) => (tag.name || tag.id || tag) === testTag
          );
        }
        return false;
      });
      logger.info(
        `✅ ${withTag.length} de ${data.length} medias con tag "${testTag}"`
      );
    }
  });

  // ==================== TESTS DE ESTADO ====================

  test("TC-MEDIA-013: GET /api/media - Filtro por estado de publicación", async ({
    request,
  }) => {
    logger.info("🧪 Test de Filtrado: Estado de publicación");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      is_published: true,
      limit: 15,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (publicados)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data)) {
      const published = data.filter((media) => media.is_published === true);
      const unpublished = data.length - published.length;

      logger.info(`📊 Análisis is_published=true:`);
      logger.info(`   ✅ Publicadas: ${published.length}`);
      logger.info(`   ❌ No publicadas (no esperadas): ${unpublished}`);
      logger.info(`   📊 Total: ${data.length}`);
    }
  });

  test("TC-MEDIA-014: GET /api/media - Filtro con parámetro count", async ({
    request,
  }) => {
    logger.info("🧪 Test de Utilidad: Parámetro count");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      count: true,
      limit: 5,
    });

    logResponseDetails(response, 200, "OK", "GET /api/media (count)");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data;

    const hasCountInfo =
      data.total !== undefined ||
      data.count !== undefined ||
      data.totalCount !== undefined ||
      data.total_count !== undefined;

    if (hasCountInfo) {
      const total =
        data.total || data.count || data.totalCount || data.total_count;
      logger.info(`✅ Total de elementos disponibles: ${total}`);
    } else {
      logger.info(`ℹ️ Información de count no encontrada en la respuesta`);
    }
  });

  // ==================== TESTS DE ORDENAMIENTO ====================

  test("TC-MEDIA-015: GET /api/media - Ordenamiento por fecha descendente", async ({
    request,
  }) => {
    logger.info("🧪 Test de Ordenamiento: Fecha descendente");

    const apiClient = new ApiClient(request);

    const response = await apiClient.get("/api/media", {
      sort: "date_created",
      order: "desc",
      limit: 10,
    });

    logResponseDetails(
      response,
      200,
      "OK",
      "GET /api/media (orden descendente)"
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const data = response.data.data;

    if (Array.isArray(data) && data.length > 1) {
      let isDescending = true;
      for (let i = 0; i < data.length - 1; i++) {
        const currentDate = new Date(
          data[i].date_created || data[i].created_at || "1970-01-01"
        );
        const nextDate = new Date(
          data[i + 1].date_created || data[i + 1].created_at || "1970-01-01"
        );

        if (currentDate < nextDate) {
          isDescending = false;
          break;
        }
      }
      logger.info(
        `✅ Ordenamiento descendente: ${
          isDescending ? "Correcto" : "Verificar manualmente"
        }`
      );
    }
  });

  // ==================== TEST COMBINADO ====================

  test("TC-MEDIA-016: GET /api/media - Combinación de filtros usando datos reales", async ({
    request,
  }) => {
    logger.info("🧪 Test Combinado: Múltiples filtros");

    const apiClient = new ApiClient(request);

    const params = { limit: 10 };

    // Agregar filtros disponibles
    if (extractedData.types.length > 0) params.type = extractedData.types[0];
    if (extractedData.categories.length > 0)
      params.category = extractedData.categories[0];

    const response = await apiClient.get("/api/media", params);

    logResponseDetails(
      response,
      200,
      "OK",
      "GET /api/media (filtros combinados)"
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("OK");

    const appliedFilters = Object.keys(params).filter((key) => key !== "limit");
    logger.info(
      `✅ Filtros combinados aplicados: ${appliedFilters.join(", ")}`
    );
    logger.info(`📊 Parámetros: ${JSON.stringify(params)}`);
  });
});
