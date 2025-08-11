require("dotenv").config();

class ApiClient {
  constructor(request) {
    this.request = request;
    this.baseUrl = process.env.API_BASE_URL || "";
    this.token = process.env.API_TOKEN || "";

    if (!this.baseUrl || !this.token) {
      throw new Error("Faltan variables de entorno API_BASE_URL o API_TOKEN");
    }
  }

  /**
   * Realizar petición GET
   * @param {string} endpoint - Endpoint a consultar
   * @param {object} params - Parámetros de query string
   * @returns {Promise<{status: number, data: any}>}
   */
  async get(endpoint, params = {}) {
    const url = this._buildUrl(endpoint, params);

    try {
      const response = await this.request.get(url, {
        headers: {
          "X-API-Token": this.token,
        },
      });

      const data = await response.json();
      return {
        status: response.status(),
        data: data,
      };
    } catch (error) {
      console.error(`Error en GET ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Realizar petición POST
   * @param {string} endpoint - Endpoint a consultar
   * @param {object} data - Datos para enviar
   * @returns {Promise<{status: number, data: any}>}
   */
  async post(endpoint, data = {}) {
    const url = this._buildUrl(endpoint, { token: this.token });

    try {
      const response = await this.request.post(url, {
        headers: {
          "X-API-Token": this.token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: data,
      });

      const responseData = await response.json();
      return {
        status: response.status(),
        data: responseData,
      };
    } catch (error) {
      console.error(`Error en POST ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Realizar petición DELETE
   * @param {string} endpoint - Endpoint a consultar
   * @returns {Promise<{status: number, data: any}>}
   */
  async delete(endpoint) {
    const url = this._buildUrl(endpoint, { token: this.token });

    try {
      const response = await this.request.delete(url, {
        headers: {
          "X-API-Token": this.token,
        },
      });

      const data = await response.json();
      return {
        status: response.status(),
        data: data,
      };
    } catch (error) {
      console.error(`Error en DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Construir URL completa con parámetros
   * @param {string} endpoint
   * @param {object} params
   * @returns {string}
   */
  _buildUrl(endpoint, params = {}) {
    // Agregar token por defecto si no está presente
    if (!params.token) {
      params.token = this.token;
    }

    const queryParams = new URLSearchParams(params).toString();
    const separator = endpoint.includes("?") ? "&" : "?";

    return `${this.baseUrl}${endpoint}${
      queryParams ? separator + queryParams : ""
    }`;
  }
}

module.exports = { ApiClient };
