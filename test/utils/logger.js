class Logger {
  constructor(context = "test") {
    this.context = context;
  }

  /**
   * Log de información
   * @param {string} message
   */
  info(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.context}] ${message}`);
  }

  /**
   * Log de error
   * @param {string} message
   * @param {Error} error
   */
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.context}] ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  /**
   * Log de warning
   * @param {string} message
   */
  warn(message) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.context}] WARNING: ${message}`);
  }

  /**
   * Log de debug
   * @param {string} message
   */
  debug(message) {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [${this.context}] DEBUG: ${message}`);
  }
}

module.exports = { Logger };
