import express from 'express';
import contactController from '../controllers/contactController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import {
  syncContacts as syncContactsSchema,
  getContacts as getContactsSchema,
  searchContacts as searchContactsSchema
} from '../schemas/contactSchemas.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// ORIGINAL CONTACT ENDPOINTS
// ============================================================================

/**
 * Sync user contacts with optimized batch processing
 * @route POST /api/v1/contacts/sync
 * @access Private
 */
router.post('/sync',
  validateBody(syncContactsSchema),
  contactController.syncContacts
);

/**
 * Get user contacts with pagination and filtering
 * @route GET /api/v1/contacts
 * @access Private
 */
router.get('/',
  validateQuery(getContactsSchema),
  contactController.getContacts
);

/**
 * Get user's favorite contacts
 * @route GET /api/v1/contacts/favorites
 * @access Private
 */
router.get('/favorites',
  contactController.getFavoriteContacts
);

/**
 * Toggle favorite status for a contact
 * @route POST /api/v1/contacts/:contactId/favorite/toggle
 * @access Private
 */
router.post('/:contactId/favorite/toggle',
  contactController.toggleFavorite
);

/**
 * Search through user contacts
 * @route GET /api/v1/contacts/search
 * @access Private
 */
router.get('/search',
  validateQuery(searchContactsSchema),
  contactController.searchContacts
);

export default router; 