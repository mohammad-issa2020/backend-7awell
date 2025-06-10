class TestService {
  constructor() {
    // In-memory storage for demo purposes
    // In a real app, this would interact with a database
    this.tests = [
      {
        id: 1,
        title: 'Sample Test 1',
        description: 'This is a sample test description',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 2,
        title: 'Sample Test 2',
        description: 'Another sample test description',
        status: 'inactive',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ];
  }

  /**
   * Get all tests with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} Tests with pagination info
   */
  async getAllTests(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        search 
      } = options;

      let filteredTests = [...this.tests];

      // Filter by status if provided
      if (status) {
        filteredTests = filteredTests.filter(test => test.status === status);
      }

      // Search in title and description if search term provided
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTests = filteredTests.filter(test => 
          test.title.toLowerCase().includes(searchLower) ||
          test.description.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const totalItems = filteredTests.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTests = filteredTests.slice(startIndex, endIndex);

      return {
        tests: paginatedTests,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Error retrieving tests: ${error.message}`);
    }
  }

  /**
   * Get a test by ID
   * @param {number} id - Test ID
   * @returns {Object|null} Test object or null if not found
   */
  async getTestById(id) {
    try {
      const test = this.tests.find(test => test.id === parseInt(id));
      return test || null;
    } catch (error) {
      throw new Error(`Error retrieving test: ${error.message}`);
    }
  }

  /**
   * Create a new test
   * @param {Object} testData - Test data
   * @returns {Object} Created test
   */
  async createTest(testData) {
    try {
      const { title, description, status = 'active' } = testData;

      // Validation
      if (!title || !description) {
        throw new Error('Title and description are required');
      }

      const newTest = {
        id: Math.max(...this.tests.map(t => t.id), 0) + 1,
        title,
        description,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.tests.push(newTest);
      return newTest;
    } catch (error) {
      throw new Error(`Error creating test: ${error.message}`);
    }
  }

  /**
   * Update a test
   * @param {number} id - Test ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} Updated test or null if not found
   */
  async updateTest(id, updateData) {
    try {
      const testIndex = this.tests.findIndex(test => test.id === parseInt(id));
      
      if (testIndex === -1) {
        return null;
      }

      const { title, description, status } = updateData;
      const existingTest = this.tests[testIndex];

      // Update only provided fields
      const updatedTest = {
        ...existingTest,
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status }),
        updatedAt: new Date()
      };

      this.tests[testIndex] = updatedTest;
      return updatedTest;
    } catch (error) {
      throw new Error(`Error updating test: ${error.message}`);
    }
  }

  /**
   * Delete a test
   * @param {number} id - Test ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteTest(id) {
    try {
      const testIndex = this.tests.findIndex(test => test.id === parseInt(id));
      
      if (testIndex === -1) {
        return false;
      }

      this.tests.splice(testIndex, 1);
      return true;
    } catch (error) {
      throw new Error(`Error deleting test: ${error.message}`);
    }
  }

  /**
   * Get test statistics
   * @returns {Object} Test statistics
   */
  async getTestStatistics() {
    try {
      const total = this.tests.length;
      const active = this.tests.filter(test => test.status === 'active').length;
      const inactive = this.tests.filter(test => test.status === 'inactive').length;

      return {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
        inactivePercentage: total > 0 ? Math.round((inactive / total) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Error retrieving test statistics: ${error.message}`);
    }
  }
}

module.exports = new TestService(); 