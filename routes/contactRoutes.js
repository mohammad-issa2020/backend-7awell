const express = require('express');
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, validateQuery } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const syncContactsSchema = Joi.object({
  phoneNumbers: Joi.array()
    .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
    .min(1)
    .max(10000)
    .required()
    .messages({
      'array.base': 'phoneNumbers must be an array',
      'array.min': 'At least one phone number is required',
      'array.max': 'Maximum 10,000 phone numbers allowed',
      'string.pattern.base': 'Invalid phone number format'
    }),
  deviceContactsCount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'deviceContactsCount must be a number',
      'number.positive': 'deviceContactsCount must be positive'
    })
});

const updateInteractionSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    })
});

const createPhoneMappingSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    })
});

const getContactsSchema = Joi.object({
  favorites: Joi.string().valid('true', 'false').default('false'),
  limit: Joi.number().min(1).max(100).default(50),
  offset: Joi.number().min(0).default(0)
});

const searchContactsSchema = Joi.object({
  q: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Search term must be at least 2 characters',
    'string.max': 'Search term must not exceed 50 characters'
  }),
  limit: Joi.number().min(1).max(50).default(20),
  offset: Joi.number().min(0).default(0)
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/v1/contacts/sync
 * @desc    Sync user contacts with the platform
 * @access  Private
 * @body    { phoneNumbers: string[], deviceContactsCount: number }
 */
router.post('/sync', 
  validateBody(syncContactsSchema),
  contactController.syncContacts
);

/**
 * @route   GET /api/v1/contacts
 * @desc    Get user contacts with pagination
 * @access  Private
 * @query   favorites=true/false, limit=50, offset=0
 */
router.get('/', 
  validateQuery(getContactsSchema),
  contactController.getContacts
);

/**
 * @route   GET /api/v1/contacts/favorites
 * @desc    Get user favorite contacts
 * @access  Private
 */
router.get('/favorites', contactController.getFavoriteContacts);

/**
 * @route   GET /api/v1/contacts/search
 * @desc    Search user contacts
 * @access  Private
 * @query   q=searchTerm, limit=20, offset=0
 */
router.get('/search', 
  validateQuery(searchContactsSchema),
  contactController.searchContacts
);

/**
 * @route   GET /api/v1/contacts/sync/status
 * @desc    Get contact sync status for user
 * @access  Private
 */
router.get('/sync/status', contactController.getSyncStatus);

/**
 * @route   GET /api/v1/contacts/stats
 * @desc    Get contact statistics for user
 * @access  Private
 */
router.get('/stats', contactController.getContactStats);

/**
 * @route   POST /api/v1/contacts/:contactId/favorite/toggle
 * @desc    Toggle contact favorite status
 * @access  Private
 * @param   contactId - UUID of the contact
 */
router.post('/:contactId/favorite/toggle', contactController.toggleFavorite);

/**
 * @route   POST /api/v1/contacts/interaction
 * @desc    Update contact interaction timestamp
 * @access  Private
 * @body    { phoneNumber: string }
 */
router.post('/interaction', 
  validateBody(updateInteractionSchema),
  contactController.updateInteraction
);

/**
 * @route   POST /api/v1/contacts/phone-mapping
 * @desc    Create phone mapping for current user
 * @access  Private
 * @body    { phoneNumber: string }
 */
router.post('/phone-mapping', 
  validateBody(createPhoneMappingSchema),
  contactController.createPhoneMapping
);

module.exports = router; 