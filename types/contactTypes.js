/**
 * @fileoverview Type definitions for Contact API
 * Provides TypeScript-like type safety using JSDoc comments
 * 
 * @typedef {Object} ContactSyncRequest
 * @property {string[]} phoneNumbers - Array of phone numbers to sync (1-10,000 items)
 * @property {number} deviceContactsCount - Total contacts on device
 * @property {number} [batchSize=500] - Batch size for processing (100-1000)
 * 
 * @typedef {Object} ContactSyncResponse
 * @property {boolean} success - Operation success status
 * @property {ContactSyncData} data - Sync operation results
 * @property {string} message - Human-readable message
 * 
 * @typedef {Object} ContactSyncData
 * @property {number} processed - Number of contacts processed
 * @property {number} added - Number of new contacts added
 * @property {number} updated - Number of existing contacts updated
 * @property {number} duration_ms - Processing duration in milliseconds
 * @property {ContactBatchInfo} batch_info - Batch processing information
 * 
 * @typedef {Object} ContactBatchInfo
 * @property {number} total_batches - Total number of batches processed
 * @property {number} batch_size - Size of each batch
 * 
 * @typedef {Object} ContactEstimateRequest
 * @property {number} contactCount - Number of contacts to estimate
 * @property {number} [batchSize] - Batch size for estimation
 * 
 * @typedef {Object} ContactEstimateResponse
 * @property {boolean} success - Operation success status
 * @property {ContactEstimateData} data - Performance estimation data
 * 
 * @typedef {Object} ContactEstimateData
 * @property {number} contactCount - Number of contacts
 * @property {number} estimatedTimeMs - Estimated processing time in milliseconds
 * @property {number} estimatedTimeSeconds - Estimated processing time in seconds
 * @property {number} numberOfBatches - Number of batches required
 * @property {ContactPerformanceLevel} performanceLevel - Performance classification
 * @property {number} recommendedBatchSize - Recommended batch size
 * 
 * @typedef {'fast' | 'medium' | 'slow'} ContactPerformanceLevel
 * 
 * @typedef {Object} ContactStatsRequest
 * @property {number} [days=30] - Number of days to include in statistics (1-365)
 * 
 * @typedef {Object} ContactStatsResponse
 * @property {boolean} success - Operation success status
 * @property {ContactStatsData} data - Statistics data
 * 
 * @typedef {Object} ContactStatsData
 * @property {number} total_syncs - Total number of sync operations
 * @property {number} total_contacts_processed - Total contacts processed
 * @property {number} average_sync_time_ms - Average sync time in milliseconds
 * @property {number} success_rate - Success rate percentage
 * @property {string} last_sync_at - ISO timestamp of last sync
 * @property {number} days_covered - Number of days covered by statistics
 * 
 * @typedef {Object} ContactQueryRequest
 * @property {string} [favorites] - Filter by favorites ("true" or "false")
 * @property {number} [limit=50] - Results per page (1-100)
 * @property {number} [offset=0] - Results to skip (≥0)
 * 
 * @typedef {Object} ContactSearchRequest
 * @property {string} q - Search query (2-50 characters)
 * @property {number} [limit=20] - Results per page (1-50)
 * @property {number} [offset=0] - Results to skip (≥0)
 * 
 * @typedef {Object} ContactResponse
 * @property {boolean} success - Operation success status
 * @property {ContactData} data - Contact data
 * @property {string} [message] - Optional message
 * 
 * @typedef {Object} ContactData
 * @property {Contact[]} contacts - Array of contacts
 * @property {PaginationInfo} pagination - Pagination information
 * 
 * @typedef {Object} Contact
 * @property {string} id - Contact UUID
 * @property {string} phone_hash - Hashed phone number
 * @property {boolean} is_favorite - Whether contact is marked as favorite
 * @property {string|null} linked_user_id - UUID of linked user (if any)
 * @property {string|null} last_interaction_at - ISO timestamp of last interaction
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 * 
 * @typedef {Object} PaginationInfo
 * @property {number} total - Total number of items
 * @property {number} limit - Items per page
 * @property {number} offset - Items skipped
 * @property {number} currentPage - Current page number (1-based)
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasMore - Whether more items exist
 * @property {boolean} hasPrevious - Whether previous items exist
 * @property {number|null} nextOffset - Offset for next page
 * @property {number|null} previousOffset - Offset for previous page
 * 
 * @typedef {Object} ContactInteractionRequest
 * @property {string} phoneNumber - Phone number to record interaction for
 * 
 * @typedef {Object} ContactInteractionResponse
 * @property {boolean} success - Operation success status
 * @property {ContactInteractionData} data - Interaction data
 * @property {string} message - Human-readable message
 * 
 * @typedef {Object} ContactInteractionData
 * @property {boolean} interaction_recorded - Whether interaction was recorded
 * @property {string} timestamp - ISO timestamp of interaction
 * 
 * @typedef {Object} ContactPhoneMappingRequest
 * @property {string} phoneNumber - Phone number to create mapping for
 * 
 * @typedef {Object} ContactFavoriteToggleResponse
 * @property {boolean} success - Operation success status
 * @property {ContactFavoriteData} data - Favorite toggle data
 * @property {string} message - Human-readable message
 * 
 * @typedef {Object} ContactFavoriteData
 * @property {string} contact_id - UUID of the contact
 * @property {boolean} is_favorite - New favorite status
 * 
 * @typedef {Object} ContactBulkInsertRequest
 * @property {ContactBulkItem[]} contacts - Array of contacts to insert
 * @property {number} [batchSize=500] - Batch size for processing
 * 
 * @typedef {Object} ContactBulkItem
 * @property {string} phone_hash - Hashed phone number
 * @property {boolean} [is_favorite=false] - Whether contact is favorite
 * @property {string|null} [linked_user_id=null] - UUID of linked user
 * 
 * @typedef {Object} ContactAnalyticsResponse
 * @property {boolean} success - Operation success status
 * @property {ContactAnalyticsData} data - Analytics data
 * 
 * @typedef {Object} ContactAnalyticsData
 * @property {number} total - Total number of contacts
 * @property {number} favorites - Number of favorite contacts
 * @property {number} withLinkedUsers - Number of contacts with linked users
 * @property {number} recentInteractions - Number of recent interactions (30 days)
 * @property {number} averageInteractionAge - Average age of interactions in days
 * 
 * @typedef {Object} ContactValidationResult
 * @property {boolean} isValid - Whether the contact data is valid
 * @property {string[]} errors - Array of validation error messages
 * @property {Contact} correctedContact - Contact with auto-corrections applied
 * 
 * @typedef {Object} ContactProcessingResult
 * @property {string[]} valid - Array of valid phone numbers
 * @property {string[]} invalid - Array of invalid phone numbers
 * @property {string[]} duplicates - Array of duplicate phone numbers
 * @property {string[][]} batches - Array of batches for processing
 * 
 * @typedef {Object} ContactSearchConditions
 * @property {ContactSearchType} type - Type of search (phone or text)
 * @property {string} value - Search value
 * @property {string} [hash] - Phone hash for phone searches
 * @property {string} [wildcard] - Wildcard pattern for text searches
 * 
 * @typedef {'phone' | 'text'} ContactSearchType
 * 
 * @typedef {Object} ContactSyncStatus
 * @property {boolean} is_syncing - Whether sync is currently in progress
 * @property {string|null} last_sync_at - ISO timestamp of last sync
 * @property {number} total_contacts - Total number of contacts
 * @property {number} pending_operations - Number of pending operations
 * 
 * @typedef {Object} ContactErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {ContactValidationError[]} [errors] - Array of validation errors
 * @property {string} message - Error message
 * @property {number} [retryAfter] - Seconds to wait before retrying (for rate limits)
 * 
 * @typedef {Object} ContactValidationError
 * @property {string} field - Field that failed validation
 * @property {string} message - Validation error message
 * @property {*} received - Value that was received
 * @property {string} expected - Expected value description
 * 
 * @typedef {Object} ContactRateLimitInfo
 * @property {number} requests - Number of requests made
 * @property {number} limit - Request limit
 * @property {number} remaining - Remaining requests
 * @property {number} resetTime - Unix timestamp when limit resets
 * 
 * @typedef {Object} ContactPerformanceMetrics
 * @property {string} operation - Operation name
 * @property {number} duration_ms - Duration in milliseconds
 * @property {number} startTime - Start timestamp
 * @property {number} endTime - End timestamp
 * @property {Object} metadata - Additional metadata
 * 
 * @typedef {Object} ContactSecurityCheck
 * @property {boolean} passed - Whether security check passed
 * @property {string[]} issues - Array of security issues found
 * @property {string} action - Action taken ('allow', 'block', 'warn')
 * 
 * @typedef {Object} ContactLimits
 * @property {number} MAX_PHONE_NUMBERS - Maximum phone numbers per sync
 * @property {number} MIN_PHONE_NUMBERS - Minimum phone numbers per sync
 * @property {number} DEFAULT_BATCH_SIZE - Default batch size
 * @property {number} MAX_BATCH_SIZE - Maximum batch size
 * @property {number} MIN_BATCH_SIZE - Minimum batch size
 * @property {number} SYNC_RATE_LIMIT_PER_HOUR - Sync operations per hour
 * @property {number} LARGE_OPERATION_THRESHOLD - Threshold for large operations
 * 
 * @typedef {Object} ContactQueryLimits
 * @property {number} DEFAULT_RESULTS_PER_PAGE - Default results per page
 * @property {number} MAX_RESULTS_PER_PAGE - Maximum results per page
 * @property {number} MIN_SEARCH_QUERY_LENGTH - Minimum search query length
 * @property {number} MAX_SEARCH_QUERY_LENGTH - Maximum search query length
 * @property {number} MAX_STATISTICS_DAYS - Maximum days for statistics
 * 
 * @typedef {Object} ContactBulkLimits
 * @property {number} MAX_BULK_INSERT_SIZE - Maximum bulk insert size
 * @property {number} DEFAULT_BULK_BATCH_SIZE - Default bulk batch size
 * @property {number} BULK_RATE_LIMIT_PER_HOUR - Bulk operations per hour
 */

// Export types for JSDoc usage
export const ContactTypes = {
  // This object exists purely for JSDoc type checking
  // All actual types are defined in the @typedef comments above
};

export default ContactTypes; 