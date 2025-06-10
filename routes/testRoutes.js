const express = require('express');
const testController = require('../controllers/testController');

const router = express.Router();

/**
 * @route   GET /api/tests
 * @desc    Get all tests with optional filtering and pagination
 * @query   page, limit, status, search
 * @access  Public (can be modified to require authentication)
 */
router.get('/', testController.getAllTests);

/**
 * @route   GET /api/tests/statistics
 * @desc    Get test statistics
 * @access  Public (can be modified to require authentication)
 */
router.get('/statistics', testController.getTestStatistics);

/**
 * @route   GET /api/tests/:id
 * @desc    Get test by ID
 * @param   id - Test ID
 * @access  Public (can be modified to require authentication)
 */
router.get('/:id', testController.getTestById);

/**
 * @route   POST /api/tests
 * @desc    Create new test
 * @body    title, description, status (optional)
 * @access  Public (can be modified to require authentication)
 */
router.post('/', testController.createTest);

/**
 * @route   PUT /api/tests/:id
 * @desc    Update test
 * @param   id - Test ID
 * @body    title, description, status (all optional)
 * @access  Public (can be modified to require authentication)
 */
router.put('/:id', testController.updateTest);

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete test
 * @param   id - Test ID
 * @access  Public (can be modified to require authentication)
 */
router.delete('/:id', testController.deleteTest);

module.exports = router; 