class TestDataManager {
  constructor() {
    this.groupIds = [];
    this.couponCodes = [];
    this.coupons = [];
  }

  /**
   * Procesar datos de cupones para extraer información útil
   * @param {object} couponsResponse - Respuesta de la API de cupones
   */
  processCouponsData(couponsResponse) {
    if (
      !couponsResponse ||
      !couponsResponse.data ||
      !Array.isArray(couponsResponse.data)
    ) {
      return;
    }

    const coupons = couponsResponse.data;

    // Limpiar arrays antes de procesar nuevos datos
    this.groupIds = [];
    this.couponCodes = [];
    this.coupons = [];

    coupons.forEach((coupon) => {
      // Guardar el cupón completo
      this.coupons.push(coupon);

      // Extraer Group ID
      if (coupon.group) {
        // Si group es un objeto, extraer el _id, si es string, usarlo directamente
        const groupId =
          typeof coupon.group === "object" && coupon.group._id
            ? coupon.group._id
            : coupon.group;

        if (groupId && !this.groupIds.includes(groupId)) {
          this.groupIds.push(groupId);
        }
      }

      // Extraer códigos de cupón
      if (coupon.code && !this.couponCodes.includes(coupon.code)) {
        this.couponCodes.push(coupon.code);
      }
    });
  }

  /**
   * Obtener todos los Group IDs únicos
   * @returns {string[]}
   */
  getAllGroupIds() {
    return [...this.groupIds];
  }

  /**
   * Obtener todos los códigos de cupón únicos
   * @returns {string[]}
   */
  getAllCouponCodes() {
    return [...this.couponCodes];
  }

  /**
   * Obtener todos los cupones procesados
   * @returns {object[]}
   */
  getAllCoupons() {
    return [...this.coupons];
  }

  /**
   * Obtener un Group ID aleatorio
   * @returns {string|null}
   */
  getRandomGroupId() {
    if (this.groupIds.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.groupIds.length);
    return this.groupIds[randomIndex];
  }

  /**
   * Obtener un código de cupón aleatorio
   * @returns {string|null}
   */
  getRandomCouponCode() {
    if (this.couponCodes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.couponCodes.length);
    return this.couponCodes[randomIndex];
  }

  /**
   * Obtener un cupón aleatorio
   * @returns {object|null}
   */
  getRandomCoupon() {
    if (this.coupons.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.coupons.length);
    return this.coupons[randomIndex];
  }

  /**
   * Obtener estadísticas de los datos procesados
   * @returns {object}
   */
  getStats() {
    return {
      totalCoupons: this.coupons.length,
      uniqueGroupIds: this.groupIds.length,
      uniqueCouponCodes: this.couponCodes.length,
    };
  }

  /**
   * Limpiar todos los datos
   */
  clear() {
    this.groupIds = [];
    this.couponCodes = [];
    this.coupons = [];
  }
}

module.exports = { TestDataManager };
