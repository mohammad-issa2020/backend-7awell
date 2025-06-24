# Winston Logging Guide

This guide explains how to use the Winston logging system implemented in this project, which provides both file logging and database logging capabilities.

## Overview

The Winston logging system provides:
- **File logging**: Logs to rotating files in the `logs/` directory
- **Database logging**: Logs to the `activity_logs` table in Supabase
- **Console logging**: For development and immediate feedback
- **Structured logging**: JSON format with metadata
- **Multiple log levels**: debug, info, warn, error
- **Automatic request/response logging**: Via middleware
- **Error handling**: Uncaught exceptions and promise rejections

## File Structure

```
utils/logger.js                    # Main Winston logger configuration
middleware/winstonMiddleware.js     # Express middleware for automatic logging
logs/                              # Auto-generated log files
├── combined.log                   # All logs (info and above)
├── error.log                      # Error logs only
├── auth.log                       # Authentication events only
├── transactions.log               # Transaction events only
├── security.log                   # Security events only
├── api.log                        # API requests only
├── exceptions.log                 # Uncaught exceptions
└── rejections.log                 # Unhandled promise rejections
```

## Basic Usage

### Import the Logger

```javascript
import logger from '../utils/logger.js';
```

### Basic Logging Methods

```javascript
// Basic logging
logger.debug('Debug message', { userId: '123', action: 'test' });
logger.info('Info message', { userId: '123', data: { key: 'value' } });
logger.warn('Warning message', { userId: '123', issue: 'potential problem' });
logger.error('Error message', { userId: '123', error: 'something went wrong' });
```

### Enhanced Logging Methods

```javascript
// User action logging (logs to both file and database)
logger.logUserAction(userId, 'User updated profile', { 
  field: 'email',
  oldValue: 'old@example.com',
  newValue: 'new@example.com'
}, req);

// Authentication logging
logger.logAuth(userId, 'Login successful', true, req, {
  method: 'email',
  twoFactorUsed: false
});

// Transaction logging
logger.logTransaction(userId, 'Sent crypto payment', {
  amount: 100,
  currency: 'SOL',
  toAddress: '7Np...',
  transactionHash: 'abc123...'
}, req);

// Security logging
logger.logSecurity(userId, 'Suspicious login attempt', 'high', {
  reason: 'Login from new device',
  location: 'Unknown'
}, req);

// API request logging (automatic via middleware)
logger.logApiRequest('POST', '/api/auth/login', 200, 150, userId, req);

// Error logging with context
logger.logError(error, {
  operation: 'database_query',
  table: 'users',
  query: 'SELECT * FROM users'
}, userId, req);

// Performance logging
logger.logPerformance('Database query execution', 1500, {
  query: 'complex_query',
  table: 'transactions'
}, userId);

// Database operation logging
logger.logDatabase('INSERT', 'users', true, {
  recordId: 'new-user-id',
  fields: ['email', 'name']
}, userId);
```

## Integration Examples

### In Services

```javascript
// services/authService.js
import logger from '../utils/logger.js';

class AuthService {
  static async login(email, password, req) {
    try {
      logger.info('Login attempt started', { email, ip: req.ip });
      
      // Your login logic here...
      const user = await User.findByEmail(email);
      
      if (!user) {
        logger.logAuth(null, 'Login failed - user not found', false, req, { email });
        throw new Error('Invalid credentials');
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        logger.logAuth(user.id, 'Login failed - invalid password', false, req, { email });
        throw new Error('Invalid credentials');
      }
      
      logger.logAuth(user.id, 'Login successful', true, req, { email });
      logger.logUserAction(user.id, 'User logged in successfully', { method: 'email' }, req);
      
      return user;
      
    } catch (error) {
      logger.logError(error, { operation: 'login', email }, null, req);
      throw error;
    }
  }
}
```

### In Controllers

```javascript
// controllers/userController.js
import logger from '../utils/logger.js';

class UserController {
  async updateProfile(req, res) {
    const startTime = Date.now();
    const userId = req.user.id;
    
    try {
      logger.logUserAction(userId, 'Profile update started', { 
        fields: Object.keys(req.body) 
      }, req);
      
      // Your update logic here...
      const updatedUser = await UserService.updateProfile(userId, req.body);
      
      const duration = Date.now() - startTime;
      logger.logPerformance('Profile update', duration, {
        fieldsUpdated: Object.keys(req.body).length
      }, userId);
      
      logger.logUserAction(userId, 'Profile updated successfully', {
        updatedFields: Object.keys(req.body)
      }, req);
      
      res.json({ success: true, data: updatedUser });
      
    } catch (error) {
      logger.logError(error, {
        operation: 'update_profile',
        userId,
        requestBody: req.body
      }, userId, req);
      
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}
```

### In Middleware

```javascript
// middleware/customMiddleware.js
import logger from '../utils/logger.js';

export const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id;
    
    // Log slow requests
    if (duration > 2000) {
      logger.logPerformance(`Slow request: ${req.method} ${req.originalUrl}`, duration, {
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent')
      }, userId);
    }
  });
  
  next();
};
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Winston logging configuration
LOG_LEVEL=info                    # debug, info, warn, error
NODE_ENV=development              # production, development
```

### Log Levels

- **debug**: Detailed information for debugging
- **info**: General information about application flow
- **warn**: Warning messages that don't stop the application
- **error**: Error messages that indicate problems

## Database Integration

The system automatically logs to the `activity_logs` table when:
- `userId` is provided in the log metadata
- Log level is `error` or `warn` (even without userId)
- Using enhanced logging methods (`logUserAction`, `logAuth`, etc.)

### Database Schema

The logs are stored in the `activity_logs` table:

```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    device_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## File Logging

### Log Files

- `combined.log`: All logs (info level and above)
- `error.log`: Error logs only
- `auth.log`: Authentication events only (login, logout, registration, etc.)
- `transactions.log`: Transaction events only (payments, transfers, etc.)
- `security.log`: Security events only (suspicious activity, breaches, etc.)
- `api.log`: API request logs only (HTTP requests/responses)
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled promise rejections

### Log Rotation

Files are automatically rotated when they reach:
- **combined.log**: 10MB max, 5 files kept
- **error.log**: 10MB max, 3 files kept
- **auth.log**: 5MB max, 10 files kept (more for security auditing)
- **transactions.log**: 5MB max, 15 files kept (more for financial auditing)
- **security.log**: 5MB max, 20 files kept (most for security monitoring)
- **api.log**: 10MB max, 7 files kept (week of API logs)
- **exceptions.log**: 5MB max, 2 files kept
- **rejections.log**: 5MB max, 2 files kept

## Middleware Integration

The system includes automatic middleware for:

### HTTP Request Logging
```javascript
// Automatically logs all HTTP requests
app.use(winstonMorgan);
app.use(winstonLoggingMiddleware({
  logRequests: true,
  logResponses: true,
  includeBody: process.env.NODE_ENV === 'development',
  excludePaths: ['/health', '/ping']
}));
```

### Authentication Logging
```javascript
// Automatically logs auth-related requests
app.use(authLoggingMiddleware);
```

### Transaction Logging
```javascript
// Automatically logs transaction-related requests
app.use(transactionLoggingMiddleware);
```

### Error Logging
```javascript
// Automatically logs all errors
app.use(errorLoggingMiddleware);
```

## Best Practices

1. **Always include userId** when available for database logging
2. **Use appropriate log levels** (debug for development, info for important events, warn for issues, error for problems)
3. **Include relevant context** in metadata
4. **Don't log sensitive data** (passwords, tokens, personal information)
5. **Use structured logging** with consistent metadata format
6. **Log performance metrics** for optimization
7. **Log security events** for monitoring

## Security Considerations

- Sensitive data is automatically filtered out
- IP addresses and user agents are logged for security analysis
- Failed authentication attempts are logged with high priority
- Rate limiting violations are automatically logged as security events

## Monitoring and Analysis

### Viewing Logs

```bash
# View recent logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log

# View authentication logs
tail -f logs/auth.log

# View transaction logs
tail -f logs/transactions.log

# View security logs
tail -f logs/security.log

# View API request logs
tail -f logs/api.log

# Search logs by user
grep "userId.*123" logs/combined.log

# Search authentication logs for specific user
grep "userId.*123" logs/auth.log

# Search transaction logs for specific amount
grep "amount.*100" logs/transactions.log

# Search security logs for failed attempts
grep "success.*false" logs/auth.log

# Monitor multiple log files simultaneously
tail -f logs/auth.log logs/transactions.log logs/security.log
```

### Log Analysis Examples

```bash
# Authentication Analysis
# Count login attempts per day
grep "Login attempt" logs/auth.log | cut -d'"' -f2 | cut -d' ' -f1 | uniq -c

# Failed login attempts
grep "success.*false" logs/auth.log

# Transaction Analysis
# Daily transaction volume
grep "Transaction completed" logs/transactions.log | cut -d'"' -f2 | cut -d' ' -f1 | uniq -c

# Large transactions (over 1000)
grep -E "amount.*[0-9]{4,}" logs/transactions.log

# Security Analysis
# High severity security events
grep "severity.*high" logs/security.log

# Suspicious activities by IP
grep "Suspicious" logs/security.log | grep -o '"ipAddress":"[^"]*"' | sort | uniq -c

# API Analysis
# Error rate analysis
grep "statusCode.*[45][0-9][0-9]" logs/api.log | wc -l

# Slow API requests (over 2000ms)
grep -E "duration.*[2-9][0-9]{3,}" logs/api.log
```

### Database Queries

```sql
-- Recent user activities
SELECT * FROM activity_logs 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC 
LIMIT 50;

-- Security events
SELECT * FROM activity_logs 
WHERE details->>'category' = 'security' 
ORDER BY created_at DESC;

-- Error logs
SELECT * FROM activity_logs 
WHERE details->>'level' = 'error' 
ORDER BY created_at DESC;
```

## Testing

The system includes mock logging for tests to avoid console spam:

```javascript
// In test files, Winston is automatically mocked
// Check tests/setup/setup.js for mock configuration
```

## Troubleshooting

### Common Issues

1. **Logs directory not created**: The system automatically creates the `logs/` directory
2. **Database connection issues**: Logs will still work for file logging
3. **Performance impact**: Database logging is asynchronous and won't block requests
4. **Log file permissions**: Ensure the application has write permissions to the project directory

### Debug Mode

Set `LOG_LEVEL=debug` in your environment to see detailed logging information. 