# 7awel Crypto Wallet API Test Suite

This directory contains comprehensive tests for the 7awel crypto wallet backend API. The test suite is divided into **Unit Tests** and **Integration Tests** to ensure thorough coverage of all functionality.

## Test Structure

```
tests/
├── setup.js                           # Unit test setup with mocks
├── auth.test.js                       # Authentication unit tests
├── transactions.test.js               # Transaction unit tests
├── promotions.test.js                 # Promotions unit tests
├── activity.test.js                   # Activity & logs unit tests
├── general.test.js                    # General API unit tests
├── integration/
│   ├── setup.js                      # Integration test setup
│   ├── auth.integration.test.js      # Authentication integration tests
│   ├── transactions.integration.test.js # Transaction integration tests
│   ├── promotions.integration.test.js   # Promotions integration tests
│   └── activity.integration.test.js     # Activity integration tests
└── README.md                         # This file
```

## Test Types

### Unit Tests
- **Purpose**: Test individual components in isolation
- **Mocking**: Use mocked services, database calls, and external APIs
- **Speed**: Fast execution (< 30 seconds total)
- **Location**: `/tests/*.test.js`
- **Coverage**: Functions, middleware, validation, error handling

### Integration Tests  
- **Purpose**: Test complete API flows and real service interactions
- **Mocking**: Minimal mocking, uses real database and service layers
- **Speed**: Slower execution (1-5 minutes total)
- **Location**: `/tests/integration/*.integration.test.js`
- **Coverage**: End-to-end workflows, database operations, API contracts

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests (slower, thorough)
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Detailed Commands

```bash
# Unit tests with watch mode
npm run test:unit:watch

# Integration tests with watch mode  
npm run test:integration:watch

# Coverage for unit tests only
npm run test:coverage:unit

# Coverage for integration tests only
npm run test:coverage:integration

# Run specific test file
npx vitest tests/auth.test.js

# Run tests matching pattern
npx vitest --testPathPattern=auth
```

## Test Configuration

### Environment Setup

Create a `.env.test` file for test-specific environment variables:

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
STYTCH_PROJECT_ID=project-test-12345
STYTCH_SECRET=secret_test_12345
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/test_db
```

### Database Setup (for Integration Tests)

For integration tests that require a real database:

1. Create a test database
2. Run migrations: `npm run db:migrate`
3. Seed test data: `npm run db:seed`

## Test Coverage Areas

### Authentication (`auth.test.js` / `auth.integration.test.js`)
- ✅ Email/phone availability checking
- ✅ OTP sending (SMS, WhatsApp, Email)
- ✅ OTP verification and session creation
- ✅ Session management (refresh, logout)
- ✅ User profile operations
- ✅ Rate limiting and security
- ✅ Error handling and validation

### Transactions (`transactions.test.js` / `transactions.integration.test.js`)
- ✅ Transaction listing with pagination
- ✅ Advanced filtering (type, status, asset, network, date range)
- ✅ Transaction creation and updates
- ✅ Transaction statistics and analytics
- ✅ Search functionality
- ✅ Cursor-based pagination
- ✅ Data validation and security

### Promotions (`promotions.test.js` / `promotions.integration.test.js`)
- ✅ Promotion listing with localization
- ✅ Promotion view/click tracking
- ✅ Analytics and reporting (admin)
- ✅ Cache management
- ✅ Admin operations (cleanup, management)
- ✅ Performance and caching behavior

### Activity & Logs (`activity.test.js` / `activity.integration.test.js`)
- ✅ Activity log management
- ✅ Security event monitoring
- ✅ Suspicious activity detection
- ✅ Data export (CSV/JSON)
- ✅ Statistics and reporting
- ✅ Batch logging operations
- ✅ Admin cleanup operations

### General APIs (`general.test.js`)
- ✅ Health checks and system status
- ✅ API documentation endpoints
- ✅ CORS and security headers
- ✅ Rate limiting
- ✅ Error handling
- ✅ Performance monitoring

## Test Features

### Comprehensive Validation
- ✅ Request/response schema validation
- ✅ Authentication and authorization
- ✅ Input sanitization and XSS prevention
- ✅ Rate limiting enforcement
- ✅ Error response formatting

### Performance Testing
- ✅ Response time validation
- ✅ Concurrent request handling
- ✅ Large dataset processing
- ✅ Memory usage monitoring

### Security Testing
- ✅ Authentication bypass attempts
- ✅ Authorization validation
- ✅ Input injection prevention
- ✅ Session security
- ✅ Data sanitization

### Real-world Scenarios
- ✅ Complete user registration flow
- ✅ Transaction lifecycle management
- ✅ Promotion interaction workflows
- ✅ Admin operations and cleanup
- ✅ Error recovery scenarios

## Test Data Management

### Unit Tests
- Use factory functions for consistent test data
- Mock external services (Stytch, databases)
- Isolated test environment per test

### Integration Tests
- Test database with real data
- Cleanup between tests
- Seed initial data for consistency
- Transaction rollback for data integrity

## Debugging Tests

### Verbose Output
```bash
# Run with detailed output
npx vitest --reporter=verbose

# Run single test with debugging
npx vitest tests/auth.test.js --reporter=verbose
```

### Test Debugging
```bash
# Debug mode (Node.js debugging)
node --inspect-brk ./node_modules/.bin/vitest

# Watch mode for development
npm run test:watch
```

## Best Practices

### Writing Tests
1. **Descriptive names**: Use clear, descriptive test names
2. **AAA pattern**: Arrange, Act, Assert
3. **Single responsibility**: One test case per test
4. **Independent tests**: No dependencies between tests
5. **Comprehensive coverage**: Test happy path, edge cases, and errors

### Test Organization
1. Group related tests in `describe` blocks
2. Use `beforeEach`/`afterEach` for setup/cleanup
3. Keep test files focused on single modules
4. Use helper functions for common operations

### Performance
1. Unit tests should be fast (< 1s per test)
2. Integration tests can be slower but reasonable (< 30s per test)
3. Use parallel execution where possible
4. Mock expensive operations in unit tests

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure test ports don't conflict with running services
2. **Database connections**: Verify test database is running and accessible
3. **Environment variables**: Check `.env.test` file is properly configured
4. **Timeouts**: Increase timeout for slow integration tests
5. **Memory issues**: Use `--max-old-space-size` for large test suites

### Getting Help

1. Check test output for specific error messages
2. Run tests in verbose mode for detailed information
3. Verify environment setup matches requirements
4. Check database connectivity and permissions
5. Review logs for service-level issues

## Contributing

When adding new tests:

1. Add unit tests for new functions/modules
2. Add integration tests for new API endpoints
3. Update this README if adding new test categories
4. Ensure tests pass before submitting PRs
5. Maintain test coverage above 80%

## Test Coverage Goals

- **Unit Tests**: > 90% code coverage
- **Integration Tests**: > 80% API endpoint coverage
- **Combined**: > 85% overall coverage
- **Critical Paths**: 100% coverage (auth, transactions, security)

Happy testing! 🧪 