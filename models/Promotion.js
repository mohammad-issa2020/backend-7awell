const { v4: uuidv4 } = require('uuid');

class Promotion {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.priority = data.priority || 1;
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.locale = data.locale || 'en';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }


  static fromData(data) {
    return new Promotion(data);
  }

  static fromArray(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(data => new Promotion(data));
  }

  validateForCreation() {
    const errors = [];

    // Required fields validation
    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!this.start_date) {
      errors.push('Start date is required');
    }

    if (!this.end_date) {
      errors.push('End date is required');
    }

    // Title length validation
    if (this.title && this.title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }

    // Date validation
    if (this.start_date && this.end_date) {
      const startDate = new Date(this.start_date);
      const endDate = new Date(this.end_date);

      if (isNaN(startDate.getTime())) {
        errors.push('Start date must be a valid date');
      }

      if (isNaN(endDate.getTime())) {
        errors.push('End date must be a valid date');
      }

      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    // Priority validation
    if (this.priority !== null && (isNaN(this.priority) || this.priority < 0)) {
      errors.push('Priority must be a positive number');
    }

    // Locale validation
    if (this.locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(this.locale)) {
      errors.push('Locale must be in format "en" or "en-US"');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  validateForUpdate() {
    const errors = [];

    // Only validate fields that are being updated (not null/undefined)
    if (this.title !== null && this.title !== undefined) {
      if (this.title.trim().length === 0) {
        errors.push('Title cannot be empty');
      }
      if (this.title.length > 255) {
        errors.push('Title must be 255 characters or less');
      }
    }

    if (this.description !== null && this.description !== undefined) {
      if (this.description.trim().length === 0) {
        errors.push('Description cannot be empty');
      }
    }

    if (this.priority !== null && this.priority !== undefined) {
      if (isNaN(this.priority) || this.priority < 0) {
        errors.push('Priority must be a positive number');
      }
    }

    if (this.locale !== null && this.locale !== undefined) {
      if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(this.locale)) {
        errors.push('Locale must be in format "en" or "en-US"');
      }
    }

    // Date validation if both dates are provided
    if (this.start_date && this.end_date) {
      const startDate = new Date(this.start_date);
      const endDate = new Date(this.end_date);

      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  isCurrentlyActive() {
    if (!this.is_active) return false;
    
    const now = new Date();
    const startDate = new Date(this.start_date);
    const endDate = new Date(this.end_date);
    
    return now >= startDate && now <= endDate;
  }

  hasExpired() {
    const now = new Date();
    const endDate = new Date(this.end_date);
    return now > endDate;
  }

  hasNotStarted() {
    const now = new Date();
    const startDate = new Date(this.start_date);
    return now < startDate;
  }

  getStatus() {
    if (!this.is_active) return 'inactive';
    if (this.hasExpired()) return 'expired';
    if (this.hasNotStarted()) return 'scheduled';
    return 'active';
  }


  toCreateData() {
    const now = new Date().toISOString();
    
    return {
      title: this.title.trim(),
      description: this.description.trim(),
      priority: this.priority,
      start_date: new Date(this.start_date).toISOString(),
      end_date: new Date(this.end_date).toISOString(),
      locale: this.locale,
      is_active: this.is_active,
      created_at: now,
      updated_at: now
    };
  }

  toUpdateData() {
    const updateData = {};
    const now = new Date().toISOString();

    // Only include fields that are not null/undefined
    if (this.title !== null && this.title !== undefined) {
      updateData.title = this.title.trim();
    }
    
    if (this.description !== null && this.description !== undefined) {
      updateData.description = this.description.trim();
    }
    
    if (this.priority !== null && this.priority !== undefined) {
      updateData.priority = this.priority;
    }
    
    if (this.start_date !== null && this.start_date !== undefined) {
      updateData.start_date = new Date(this.start_date).toISOString();
    }
    
    if (this.end_date !== null && this.end_date !== undefined) {
      updateData.end_date = new Date(this.end_date).toISOString();
    }
    
    if (this.locale !== null && this.locale !== undefined) {
      updateData.locale = this.locale;
    }
    
    if (this.is_active !== null && this.is_active !== undefined) {
      updateData.is_active = this.is_active;
    }

    updateData.updated_at = now;
    
    return updateData;
  }

  /**
   * Convert to API response format
   * @returns {Object} API-ready object
   */
  toApiResponse() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      start_date: this.start_date,
      end_date: this.end_date,
      locale: this.locale,
      is_active: this.is_active,
      status: this.getStatus(),
      is_currently_active: this.isCurrentlyActive(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Convert to user-facing format (for mobile apps)
   * @returns {Object} User-friendly object
   */
  toUserResponse() {
    return {
      promotion_id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      start_date: this.start_date,
      end_date: this.end_date,
      locale: this.locale,
      is_active: this.isCurrentlyActive()
    };
  }

  /**
   * Create a copy of this promotion
   * @returns {Promotion} New Promotion instance
   */
  clone() {
    return new Promotion({
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      start_date: this.start_date,
      end_date: this.end_date,
      locale: this.locale,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    });
  }

  /**
   * Update this promotion with new data
   * @param {Object} updateData - Data to update
   * @returns {Promotion} This promotion instance
   */
  update(updateData) {
    Object.keys(updateData).forEach(key => {
      if (this.hasOwnProperty(key) && updateData[key] !== undefined) {
        this[key] = updateData[key];
      }
    });
    
    this.updated_at = new Date().toISOString();
    return this;
  }

  /**
   * Get allowed fields for updates
   * @returns {Array} Array of allowed field names
   */
  static getAllowedUpdateFields() {
    return [
      'title', 'description', 'priority', 'start_date', 'end_date', 'locale', 'is_active'
    ];
  }

  /**
   * Create a new promotion with default values
   * @returns {Promotion} New promotion with defaults
   */
  static createDefault() {
    return new Promotion({
      priority: 1,
      locale: 'en',
      is_active: true
    });
  }

  /**
   * Create and validate promotion from data
   * @param {Object} data - Raw promotion data
   * @returns {Promotion} Validated promotion instance
   * @throws {Error} If validation fails
   */
  static createValidated(data) {
    const promotion = new Promotion(data);
    const validation = promotion.validateForCreation();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return promotion;
  }

  /**
   * Create promotion from database row
   * @param {Object} dbRow - Database row data
   * @returns {Promotion} Promotion instance
   */
  static fromDatabase(dbRow) {
    if (!dbRow) return null;
    
    return new Promotion({
      id: dbRow.id,
      title: dbRow.title || '',
      description: dbRow.description || '',
      priority: dbRow.priority || 1,
      start_date: dbRow.start_date,
      end_date: dbRow.end_date,
      locale: dbRow.locale || 'en',
      is_active: dbRow.is_active !== undefined ? dbRow.is_active : true,
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at
    });
  }

  /**
   * Create multiple promotions from database rows
   * @param {Array} dbRows - Array of database rows
   * @returns {Array<Promotion>} Array of promotion instances
   */
  static fromDatabaseArray(dbRows) {
    if (!Array.isArray(dbRows)) return [];
    return dbRows.map(row => Promotion.fromDatabase(row));
  }

  /**
   * Check if promotion data is valid for updates
   * @param {Object} updateData - Data to validate
   * @returns {Object} Validation result
   */
  static validateUpdateData(updateData) {
    const tempPromotion = new Promotion(updateData);
    return tempPromotion.validateForUpdate();
  }
}

module.exports = Promotion; 