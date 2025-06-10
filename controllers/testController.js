const testService = require('../services/testService');
const BaseResponse = require('../utils/baseResponse');

class TestController {
  /**
   * Get all tests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllTests(req, res) {
    try {
      const { page, limit, status, search } = req.query;
      
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search
      };

      const result = await testService.getAllTests(options);
      
      return BaseResponse.paginated(
        res, 
        result.tests, 
        result.pagination,
        'Tests retrieved successfully'
      );
    } catch (error) {
      console.error('Error in getAllTests:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Get test by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTestById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return BaseResponse.validationError(res, 
          { id: 'Valid test ID is required' }, 
          'Invalid test ID'
        );
      }

      const test = await testService.getTestById(id);
      
      if (!test) {
        return BaseResponse.notFound(res, 'Test not found');
      }

      return BaseResponse.success(res, test, 'Test retrieved successfully');
    } catch (error) {
      console.error('Error in getTestById:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Create new test
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTest(req, res) {
    try {
      const { title, description, status } = req.body;
      
      // Validation
      const errors = {};
      if (!title) errors.title = 'Title is required';
      if (!description) errors.description = 'Description is required';
      if (status && !['active', 'inactive'].includes(status)) {
        errors.status = 'Status must be either "active" or "inactive"';
      }

      if (Object.keys(errors).length > 0) {
        return BaseResponse.validationError(res, errors, 'Validation failed');
      }

      const newTest = await testService.createTest({ title, description, status });
      
      return BaseResponse.success(res, newTest, 'Test created successfully', 201);
    } catch (error) {
      console.error('Error in createTest:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Update test
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTest(req, res) {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;
      
      if (!id || isNaN(id)) {
        return BaseResponse.validationError(res, 
          { id: 'Valid test ID is required' }, 
          'Invalid test ID'
        );
      }

      // Validation
      const errors = {};
      if (status && !['active', 'inactive'].includes(status)) {
        errors.status = 'Status must be either "active" or "inactive"';
      }

      if (Object.keys(errors).length > 0) {
        return BaseResponse.validationError(res, errors, 'Validation failed');
      }

      const updatedTest = await testService.updateTest(id, { title, description, status });
      
      if (!updatedTest) {
        return BaseResponse.notFound(res, 'Test not found');
      }

      return BaseResponse.success(res, updatedTest, 'Test updated successfully');
    } catch (error) {
      console.error('Error in updateTest:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Delete test
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteTest(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return BaseResponse.validationError(res, 
          { id: 'Valid test ID is required' }, 
          'Invalid test ID'
        );
      }

      const deleted = await testService.deleteTest(id);
      
      if (!deleted) {
        return BaseResponse.notFound(res, 'Test not found');
      }

      return BaseResponse.success(res, null, 'Test deleted successfully');
    } catch (error) {
      console.error('Error in deleteTest:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Get test statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTestStatistics(req, res) {
    try {
      const statistics = await testService.getTestStatistics();
      
      return BaseResponse.success(res, statistics, 'Test statistics retrieved successfully');
    } catch (error) {
      console.error('Error in getTestStatistics:', error);
      return BaseResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new TestController(); 