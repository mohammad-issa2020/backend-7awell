// ============================================================================
// CONTACT SYNC LIMITS
// ============================================================================

export const SYNC_LIMITS = {
  MAX_PHONE_NUMBERS_PER_SYNC: 10000,
  MIN_PHONE_NUMBERS_PER_SYNC: 1,
  
  MIN_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  DEFAULT_BATCH_SIZE: 500,
  
  MAX_STATISTICS_DAYS: 365,
  MIN_STATISTICS_DAYS: 1,
  DEFAULT_STATISTICS_DAYS: 30
};

// ============================================================================
// CONTACT QUERY LIMITS
// ============================================================================

export const QUERY_LIMITS = {
  MAX_RESULTS_PER_PAGE: 100,
  MIN_RESULTS_PER_PAGE: 1,
  DEFAULT_RESULTS_PER_PAGE: 50,
  
  SEARCH_MAX_RESULTS: 50,
  SEARCH_DEFAULT_RESULTS: 20,
  
  MIN_SEARCH_TERM_LENGTH: 2,
  MAX_SEARCH_TERM_LENGTH: 50
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

export const VALIDATION_PATTERNS = {
  PHONE_NUMBER: /^\+?[1-9]\d{1,14}$/,
  PHONE_NUMBER_WITH_ENCODING: /^(\+|%2B|\s)[1-9]\d{1,14}$/
};

// ============================================================================
// BULK OPERATION LIMITS
// ============================================================================

export const BULK_LIMITS = {
  MAX_CONTACTS_PER_BULK_INSERT: 10000,
  MIN_CONTACTS_PER_BULK_INSERT: 1
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  PHONE_NUMBER_INVALID: 'Invalid phone number format',
  UUID_INVALID: 'Invalid UUID format',
  
  SYNC: {
    PHONE_NUMBERS_REQUIRED: 'At least one phone number required',
    TOO_MANY_PHONE_NUMBERS: `Maximum ${SYNC_LIMITS.MAX_PHONE_NUMBERS_PER_SYNC.toLocaleString()} phone numbers allowed`,
    DEVICE_COUNT_POSITIVE: 'Device contacts count must be positive',
    BATCH_SIZE_TOO_SMALL: `Minimum batch size is ${SYNC_LIMITS.MIN_BATCH_SIZE}`,
    BATCH_SIZE_TOO_LARGE: `Maximum batch size is ${SYNC_LIMITS.MAX_BATCH_SIZE}`
  },
  
  QUERY: {
    SEARCH_TERM_TOO_SHORT: `Search term must be at least ${QUERY_LIMITS.MIN_SEARCH_TERM_LENGTH} characters`,
    SEARCH_TERM_TOO_LONG: `Search term cannot exceed ${QUERY_LIMITS.MAX_SEARCH_TERM_LENGTH} characters`
  },
  
  BULK: {
    CONTACTS_REQUIRED: 'At least one contact required',
    TOO_MANY_CONTACTS: `Maximum ${BULK_LIMITS.MAX_CONTACTS_PER_BULK_INSERT.toLocaleString()} contacts allowed`,
    PHONE_HASH_REQUIRED: 'Phone hash required'
  }
}; 