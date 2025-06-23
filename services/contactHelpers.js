/**
 * @fileoverview Helper functions for contact operations
 * Contains reusable business logic and utility functions
 */

import crypto from 'crypto';
import { SYNC_LIMITS, QUERY_LIMITS } from '../constants/contactConstants.js';

// ============================================================================
// PHONE NUMBER UTILITIES
// ============================================================================

/**
 * Generate a consistent hash for a phone number
 * @param {string} phoneNumber - Phone number to hash
 * @returns {string} SHA-256 hash of the phone number
 */
export const generatePhoneHash = (phoneNumber) => {
  if (!phoneNumber) throw new Error('Phone number is required for hashing');
  
  // Normalize phone number before hashing
  const normalized = normalizePhoneNumber(phoneNumber);
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Normalize phone number to consistent format
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return phoneNumber;
  
  // Remove all non-digit characters except +
  let normalized = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const normalized = normalizePhoneNumber(phoneNumber);
  return /^\+[1-9]\d{1,14}$/.test(normalized);
};

/**
 * Batch process phone numbers with validation
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {number} batchSize - Size of each batch
 * @returns {Object} Processing results
 */
export const batchProcessPhoneNumbers = (phoneNumbers, batchSize = SYNC_LIMITS.DEFAULT_BATCH_SIZE) => {
  const results = {
    valid: [],
    invalid: [],
    duplicates: [],
    batches: []
  };
  
  // Track seen numbers to identify duplicates
  const seenNumbers = new Set();
  
  // Validate and categorize phone numbers
  phoneNumbers.forEach(number => {
    if (!isValidPhoneNumber(number)) {
      results.invalid.push(number);
      return;
    }
    
    const normalized = normalizePhoneNumber(number);
    
    if (seenNumbers.has(normalized)) {
      results.duplicates.push(number);
      return;
    }
    
    seenNumbers.add(normalized);
    results.valid.push(normalized);
  });
  
  // Create batches from valid numbers
  for (let i = 0; i < results.valid.length; i += batchSize) {
    results.batches.push(results.valid.slice(i, i + batchSize));
  }
  
  return results;
};

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} limit - Items per page
 * @param {number} offset - Items to skip
 * @returns {Object} Pagination metadata
 */
export const calculatePagination = (total, limit, offset) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    limit,
    offset,
    currentPage,
    totalPages,
    hasMore: offset + limit < total,
    hasPrevious: offset > 0,
    nextOffset: offset + limit < total ? offset + limit : null,
    previousOffset: offset > 0 ? Math.max(0, offset - limit) : null
  };
};

/**
 * Validate and normalize pagination parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Normalized pagination parameters
 */
export const normalizePaginationParams = (params) => {
  const limit = Math.min(
    Math.max(parseInt(params.limit) || QUERY_LIMITS.DEFAULT_RESULTS_PER_PAGE, 1),
    QUERY_LIMITS.MAX_RESULTS_PER_PAGE
  );
  
  const offset = Math.max(parseInt(params.offset) || 0, 0);
  
  return { limit, offset };
};

// ============================================================================
// CONTACT SEARCH UTILITIES
// ============================================================================

/**
 * Prepare search term for database query
 * @param {string} searchTerm - Raw search term
 * @returns {string} Prepared search term
 */
export const prepareSearchTerm = (searchTerm) => {
  if (!searchTerm) return '';
  
  // Remove special characters and normalize whitespace
  return searchTerm
    .trim()
    .replace(/[^\w\s+\-@.]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

/**
 * Build search conditions for different contact fields
 * @param {string} searchTerm - Search term
 * @returns {Object} Search conditions
 */
export const buildContactSearchConditions = (searchTerm) => {
  const prepared = prepareSearchTerm(searchTerm);
  
  if (!prepared) return {};
  
  // Check if search term looks like a phone number
  const isPhoneSearch = /^[\d\s+\-()]+$/.test(searchTerm);
  
  if (isPhoneSearch) {
    // For phone number searches, try to normalize
    const normalizedPhone = normalizePhoneNumber(searchTerm);
    return {
      type: 'phone',
      value: normalizedPhone,
      hash: generatePhoneHash(normalizedPhone)
    };
  }
  
  // For text searches, prepare for partial matching
  return {
    type: 'text',
    value: prepared,
    wildcard: `%${prepared}%`
  };
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Estimate sync performance based on contact count
 * @param {number} contactCount - Number of contacts to sync
 * @param {number} batchSize - Batch size for processing
 * @returns {Object} Performance estimates
 */
export const estimateSyncPerformance = (contactCount, batchSize = SYNC_LIMITS.DEFAULT_BATCH_SIZE) => {
  // Base processing time per contact (in milliseconds)
  const baseTimePerContact = 2;
  
  // Additional overhead per batch
  const batchOverhead = 50;
  
  const numberOfBatches = Math.ceil(contactCount / batchSize);
  const estimatedTime = (contactCount * baseTimePerContact) + (numberOfBatches * batchOverhead);
  
  // Determine performance level
  let performanceLevel = 'fast';
  if (estimatedTime > 5000) performanceLevel = 'medium';
  if (estimatedTime > 15000) performanceLevel = 'slow';
  
  return {
    contactCount,
    batchSize,
    numberOfBatches,
    estimatedTimeMs: estimatedTime,
    estimatedTimeSeconds: Math.round(estimatedTime / 1000),
    performanceLevel,
    recommendedBatchSize: contactCount > 5000 ? SYNC_LIMITS.MAX_BATCH_SIZE : batchSize
  };
};

/**
 * Monitor request performance and log if needed
 * @param {string} operation - Operation name
 * @param {number} startTime - Operation start time
 * @param {Object} metadata - Additional metadata
 */
export const logPerformanceMetrics = (operation, startTime, metadata = {}) => {
  const duration = Date.now() - startTime;
  
  // Log slow operations
  if (duration > 1000) {
    console.warn(`🐌 Slow operation detected: ${operation} took ${duration}ms`, metadata);
  }
  
  // Log very fast operations for optimization insights
  if (duration < 10 && metadata.itemCount > 100) {
    console.info(`⚡ Fast operation: ${operation} processed ${metadata.itemCount} items in ${duration}ms`);
  }
  
  return duration;
};

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

/**
 * Validate contact data integrity
 * @param {Object} contact - Contact object to validate
 * @returns {Object} Validation result
 */
export const validateContactIntegrity = (contact) => {
  const errors = [];
  
  if (!contact.phone_hash) {
    errors.push('Phone hash is required');
  }
  
  if (contact.owner_id && !isValidUUID(contact.owner_id)) {
    errors.push('Invalid owner ID format');
  }
  
  if (contact.linked_user_id && !isValidUUID(contact.linked_user_id)) {
    errors.push('Invalid linked user ID format');
  }
  
  if (typeof contact.is_favorite !== 'boolean') {
    contact.is_favorite = false; // Auto-correct
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    correctedContact: contact
  };
};

/**
 * Simple UUID validation
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Whether UUID is valid
 */
export const isValidUUID = (uuid) => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
};

// ============================================================================
// STATISTICAL HELPERS
// ============================================================================

/**
 * Calculate contact statistics
 * @param {Object[]} contacts - Array of contacts
 * @returns {Object} Statistical summary
 */
export const calculateContactStats = (contacts) => {
  const stats = {
    total: contacts.length,
    favorites: 0,
    withLinkedUsers: 0,
    recentInteractions: 0,
    averageInteractionAge: 0
  };
  
  const now = new Date();
  let totalInteractionAge = 0;
  let interactionCount = 0;
  
  contacts.forEach(contact => {
    if (contact.is_favorite) stats.favorites++;
    if (contact.linked_user_id) stats.withLinkedUsers++;
    
    if (contact.last_interaction_at) {
      const interactionAge = now - new Date(contact.last_interaction_at);
      
      // Recent interaction (within 30 days)
      if (interactionAge < 30 * 24 * 60 * 60 * 1000) {
        stats.recentInteractions++;
      }
      
      totalInteractionAge += interactionAge;
      interactionCount++;
    }
  });
  
  if (interactionCount > 0) {
    stats.averageInteractionAge = Math.round(totalInteractionAge / interactionCount / (24 * 60 * 60 * 1000));
  }
  
  return stats;
};

// ============================================================================
// EXPORT ALL HELPERS
// ============================================================================

export default {
  // Phone utilities
  generatePhoneHash,
  normalizePhoneNumber,
  isValidPhoneNumber,
  batchProcessPhoneNumbers,
  
  // Pagination utilities
  calculatePagination,
  normalizePaginationParams,
  
  // Search utilities
  prepareSearchTerm,
  buildContactSearchConditions,
  
  // Performance utilities
  estimateSyncPerformance,
  logPerformanceMetrics,
  
  // Validation utilities
  validateContactIntegrity,
  isValidUUID,
  
  // Statistical utilities
  calculateContactStats
}; 