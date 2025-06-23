import { z } from 'zod';
import { 
  SYNC_LIMITS, 
  QUERY_LIMITS, 
  BULK_LIMITS, 
  VALIDATION_PATTERNS, 
  ERROR_MESSAGES 
} from '../constants/contactConstants.js';

// ============================================================================
// SHARED VALIDATION PRIMITIVES
// ============================================================================

/**
 * Phone number validation with normalization
 * Handles multiple formats: +1234567890, %2B1234567890, or space prefix
 */
export const phoneNumber = z.string()
  .regex(VALIDATION_PATTERNS.PHONE_NUMBER, ERROR_MESSAGES.PHONE_NUMBER_INVALID)
  .transform(normalizePhoneNumber);

/**
 * UUID validation schema
 */
export const uuid = z.string().uuid(ERROR_MESSAGES.UUID_INVALID);

/**
 * Standard pagination parameters
 */
export const pagination = {
  limit: z.coerce.number()
    .int()
    .min(QUERY_LIMITS.MIN_RESULTS_PER_PAGE)
    .max(QUERY_LIMITS.MAX_RESULTS_PER_PAGE)
    .default(QUERY_LIMITS.DEFAULT_RESULTS_PER_PAGE),
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0)
};

/**
 * Batch size for bulk operations
 */
export const batchSize = z.number()
  .int()
  .min(SYNC_LIMITS.MIN_BATCH_SIZE, ERROR_MESSAGES.SYNC.BATCH_SIZE_TOO_SMALL)
  .max(SYNC_LIMITS.MAX_BATCH_SIZE, ERROR_MESSAGES.SYNC.BATCH_SIZE_TOO_LARGE)
  .optional();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize phone number format to ensure consistent format
 * @param {string} value - Phone number to normalize
 * @returns {string} - Normalized phone number with + prefix
 */
function normalizePhoneNumber(value) {
  if (!value) return value;
  
  // Handle URL encoding and space prefixes
  if (value.startsWith(' ')) {
    return '+' + value.slice(1);
  }
  
  if (value.startsWith('%2B')) {
    return '+' + value.slice(3);
  }
  
  // Ensure + prefix
  return value.startsWith('+') ? value : '+' + value;
}

// ============================================================================
// CONTACT SYNC SCHEMAS
// ============================================================================

/**
 * Schema for syncing user contacts with the platform (LEGACY - INSECURE)
 * @deprecated Use syncSecure instead for better security
 */
export const syncContacts = z.object({
  phoneNumbers: z.array(phoneNumber)
    .min(SYNC_LIMITS.MIN_PHONE_NUMBERS_PER_SYNC, ERROR_MESSAGES.SYNC.PHONE_NUMBERS_REQUIRED)
    .max(SYNC_LIMITS.MAX_PHONE_NUMBERS_PER_SYNC, ERROR_MESSAGES.SYNC.TOO_MANY_PHONE_NUMBERS),
  deviceContactsCount: z.number()
    .positive(ERROR_MESSAGES.SYNC.DEVICE_COUNT_POSITIVE),
  batchSize
});

/**
 * Schema for secure contact syncing with pre-hashed phone numbers
 * This is the RECOMMENDED approach for production use
 */
export const syncSecure = z.object({
  contactHashes: z.array(z.object({
    phoneHash: z.string()
      .length(64, 'Phone hash must be exactly 64 characters (SHA-256)')
      .regex(/^[a-f0-9]{64}$/, 'Invalid hash format - must be lowercase hex'),
    displayName: z.string().optional(),
    isFromDevice: z.boolean().default(true)
  }))
  .min(SYNC_LIMITS.MIN_PHONE_NUMBERS_PER_SYNC, ERROR_MESSAGES.SYNC.PHONE_NUMBERS_REQUIRED)
  .max(SYNC_LIMITS.MAX_PHONE_NUMBERS_PER_SYNC, ERROR_MESSAGES.SYNC.TOO_MANY_PHONE_NUMBERS),
  
  deviceContactsCount: z.number()
    .positive(ERROR_MESSAGES.SYNC.DEVICE_COUNT_POSITIVE),
  
  hashingMethod: z.enum(['SHA256'], {
    errorMap: () => ({ message: 'Only SHA256 hashing method is supported' })
  }),
  
  timestamp: z.string().datetime({
    message: 'Valid ISO datetime string required'
  }),
  
  batchSize
});

/**
 * Schema for estimating sync performance
 */
export const estimateSync = z.object({
  contactCount: z.number()
    .int()
    .min(SYNC_LIMITS.MIN_PHONE_NUMBERS_PER_SYNC)
    .max(SYNC_LIMITS.MAX_PHONE_NUMBERS_PER_SYNC),
  batchSize
});

/**
 * Schema for retrieving sync statistics
 */
export const syncStatistics = z.object({
  days: z.coerce.number()
    .int()
    .min(SYNC_LIMITS.MIN_STATISTICS_DAYS)
    .max(SYNC_LIMITS.MAX_STATISTICS_DAYS)
    .default(SYNC_LIMITS.DEFAULT_STATISTICS_DAYS)
});

// ============================================================================
// CONTACT QUERY SCHEMAS
// ============================================================================

/**
 * Schema for retrieving contacts with filters
 */
export const getContacts = z.object({
  favorites: z.enum(['true', 'false']).default('false'),
  ...pagination
});

/**
 * Schema for searching contacts
 */
export const searchContacts = z.object({
  q: z.string()
    .min(QUERY_LIMITS.MIN_SEARCH_TERM_LENGTH, ERROR_MESSAGES.QUERY.SEARCH_TERM_TOO_SHORT)
    .max(QUERY_LIMITS.MAX_SEARCH_TERM_LENGTH, ERROR_MESSAGES.QUERY.SEARCH_TERM_TOO_LONG),
  limit: z.coerce.number()
    .int()
    .min(QUERY_LIMITS.MIN_RESULTS_PER_PAGE)
    .max(QUERY_LIMITS.SEARCH_MAX_RESULTS)
    .default(QUERY_LIMITS.SEARCH_DEFAULT_RESULTS),
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0)
});

// ============================================================================
// CONTACT ACTION SCHEMAS
// ============================================================================

/**
 * Schema for recording contact interaction
 */
export const updateInteraction = z.object({
  phoneNumber
});

/**
 * Schema for creating phone number mapping
 */
export const createPhoneMapping = z.object({
  phoneNumber
});

/**
 * Individual contact schema for bulk operations
 */
const contactSchema = z.object({
  owner_id: uuid.optional(),
  phone_hash: z.string().min(1, ERROR_MESSAGES.BULK.PHONE_HASH_REQUIRED),
  is_favorite: z.boolean().default(false),
  linked_user_id: uuid.nullable().optional()
});

/**
 * Schema for bulk contact insertion
 */
export const bulkInsert = z.object({
  contacts: z.array(contactSchema)
    .min(BULK_LIMITS.MIN_CONTACTS_PER_BULK_INSERT, ERROR_MESSAGES.BULK.CONTACTS_REQUIRED)
    .max(BULK_LIMITS.MAX_CONTACTS_PER_BULK_INSERT, ERROR_MESSAGES.BULK.TOO_MANY_CONTACTS),
  batchSize
});

// ============================================================================
// EXPORTED SCHEMA GROUPS
// ============================================================================

export const contactSyncSchemas = {
  sync: syncContacts,        // Legacy - insecure
  syncSecure: syncSecure,    // Recommended - secure
  estimate: estimateSync,
  statistics: syncStatistics
};

export const contactQuerySchemas = {
  get: getContacts,
  search: searchContacts
};

export const contactActionSchemas = {
  updateInteraction,
  createPhoneMapping,
  bulkInsert
}; 