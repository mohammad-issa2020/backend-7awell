# Stytch Authentication Resources Documentation

### Overview

This document provides comprehensive documentation for all Stytch authentication resources used in the 7awell application. Each resource is explained with its purpose, usage examples, and integration details.

---

## Table of Contents

1. [Users Management](#users-management)
2. [OTP Authentication](#otp-authentication)
3. [Session Management](#session-management)
4. [Magic Links](#magic-links)
5. [Configuration](#configuration)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Security Best Practices](#security-best-practices)
9. [Integration Testing](#integration-testing)
10. [Monitoring and Logging](#monitoring-and-logging)

---

## Users Management

**Documentation**: [Stytch User Management Guide](https://stytch.com/docs/guides/users/overview)

### 1. `users.search()`

**Purpose**: Search for existing users in Stytch database to check availability

**Documentation**: [Stytch Users Search API](https://stytch.com/docs/api/search-users)

**Usage in Code**:
```javascript
// Check phone availability
const phoneSearchResult = await stytchClient.users.search({
  query: {
    operator: 'AND',
    operands: [{
      filter_name: 'phone_number',
      filter_value: [phoneNumber]
    }]
  }
});

// Check email availability
const emailSearchResult = await stytchClient.users.search({
  query: {
    operator: 'AND',
    operands: [{
      filter_name: 'email',
      filter_value: [email]
    }]
  }
});
```

**Implementation Files**:
- `services/authService.js` - `checkAvailability()` method
- `services/authService.js` - `completeLogin()` method

**Parameters**:
- `query.operator`: 'AND' | 'OR'
- `query.operands`: Array of filter objects
- `filter_name`: 'phone_number' | 'email' | 'user_id'
- `filter_value`: Array of values to search for

**Response**:
```javascript
{
  results: [
    {
      user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
      emails: [{email: "user@example.com", verified: true}],
      phone_numbers: [{phone_number: "+1234567890", verified: true}],
      status: "active"
    }
  ],
  results_metadata: {
    total: 1,
    next_cursor: null
  }
}
```

### 2. `users.create()`

**Purpose**: Create new user in Stytch system

**Documentation**: [Stytch Users Create API](https://stytch.com/docs/api/create-user)

**Usage in Code**:
```javascript
const createUserResult = await stytchClient.users.create({
  phone_number: sessionData.phoneNumber,
  email: sessionData.email
});
```

**Implementation Files**:
- `services/authService.js` - `completeLogin()` method

**Parameters**:
- `phone_number`: String (E.164 format)
- `email`: String (valid email format)
- `name`: Object (optional) - {first_name, last_name}

**Response**:
```javascript
{
  user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
  emails: [{email: "user@example.com", verified: false}],
  phone_numbers: [{phone_number: "+1234567890", verified: false}],
  created_at: "2023-01-01T00:00:00Z",
  status: "active"
}
```

---

## OTP Authentication

**Documentation**: [Stytch OTP Guide](https://stytch.com/docs/guides/passcodes/overview)

### 3. `otps.sms.loginOrCreate()`

**Purpose**: Send SMS OTP to phone number

**Documentation**: [Stytch SMS OTP API](https://stytch.com/docs/api/send-otp-by-sms)

**Usage in Code**:
```javascript
const otpResult = await stytchClient.otps.sms.loginOrCreate({
  phone_number: value,
  expiration_minutes: 5
});
```

**Implementation Files**:
- `services/authService.js` - `sendVerificationOTP()` method

**Parameters**:
- `phone_number`: String (E.164 format, required)
- `expiration_minutes`: Number (1-60, default: 5)
- `attributes`: Object (optional metadata)

**Response**:
```javascript
{
  method_id: "phone-number-test-d5a3b680-e8a3-40c0-b815-ab79986666d0",
  phone_id: "phone-number-test-d5a3b680-e8a3-40c0-b815-ab79986666d0",
  phone_number: "+1234567890",
  user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
  status_code: 200
}
```

### 4. `otps.whatsapp.loginOrCreate()`

**Purpose**: Send WhatsApp OTP to phone number

**Documentation**: [Stytch WhatsApp OTP API](https://stytch.com/docs/api/whatsapp-send)

**Usage in Code**:
```javascript
const otpResult = await stytchClient.otps.whatsapp.loginOrCreate({
  phone_number: value,
  expiration_minutes: 5
});
```

**Implementation Files**:
- `services/authService.js` - `sendVerificationOTP()` method

**Parameters**: Same as SMS OTP

**Additional Info**: [OTP Passcodes Guide](https://stytch.com/docs/guides/passcodes/api)

### 5. `otps.email.loginOrCreate()`

**Purpose**: Send email OTP to email address

**Documentation**: [Stytch Email OTP API](https://stytch.com/docs/api/send-otp-by-email)

**Usage in Code**:
```javascript
const otpResult = await stytchClient.otps.email.loginOrCreate({
  email: value,
  expiration_minutes: 5
});
```

**Implementation Files**:
- `services/authService.js` - `sendVerificationOTP()` method

**Parameters**:
- `email`: String (valid email format, required)
- `expiration_minutes`: Number (1-60, default: 5)
- `login_template_id`: String (optional custom template)
- `signup_template_id`: String (optional custom template)

### 6. `otps.authenticate()`

**Purpose**: Verify OTP code sent via SMS/WhatsApp/Email

**Documentation**: [Stytch OTP Authenticate API](https://stytch.com/docs/api/authenticate-otp)

**Usage in Code**:
```javascript
const verifyResult = await stytchClient.otps.authenticate({
  method_id: methodId,
  code: otp,
  attributes: {
    ip_address: req.ip,
    user_agent: req.get('User-Agent')
  }
});
```

**Implementation Files**:
- `services/authService.js` - `verifyVerificationOTP()` method

**Parameters**:
- `method_id`: String (from OTP send response, required)
- `code`: String (6-digit OTP code, required)
- `attributes`: Object (optional metadata)
- `session_duration_minutes`: Number (optional, 5-10080)

**Response**:
```javascript
{
  method_id: "phone-number-test-d5a3b680-e8a3-40c0-b815-ab79986666d0",
  user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
  user: {
    user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
    emails: [],
    phone_numbers: [{phone_number: "+1234567890", verified: true}],
    status: "active"
  },
  session_token: "WJtR5BCy38Szd5AfoDpf0iqFVuT4RPL96PvgNjSWy...",
  session_jwt: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  status_code: 200
}
```

---

## Session Management

**Documentation**: [Stytch Session Management Guide](https://stytch.com/docs/guides/sessions/backend)

### 7. `sessions.authenticate()`

**Purpose**: Validate and refresh existing session

**Documentation**: [Stytch Sessions Authenticate API](https://stytch.com/docs/api/session-auth)

**Usage in Code**:
```javascript
const result = await stytchClient.sessions.authenticate({
  session_token: session_token
});
```

**Implementation Files**:
- `services/authService.js` - `refreshSession()` method
- `services/authService.js` - `validateSession()` method

**Parameters**:
- `session_token`: String (JWT session token, required)
- `session_duration_minutes`: Number (optional, extends session)

**Response**:
```javascript
{
  user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
  session_id: "session-test-fe6c3994-f7d8-4c7d-9c4d-6c7b3b6b3b6b",
  session_token: "WJtR5BCy38Szd5AfoDpf0iqFVuT4RPL96PvgNjSWy...",
  session_jwt: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
    emails: [{email: "user@example.com", verified: true}],
    phone_numbers: [{phone_number: "+1234567890", verified: true}],
    status: "active"
  },
  session: {
    session_id: "session-test-fe6c3994-f7d8-4c7d-9c4d-6c7b3b6b3b6b",
    user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
    started_at: "2023-01-01T00:00:00Z",
    last_accessed_at: "2023-01-01T01:00:00Z",
    expires_at: "2023-01-08T00:00:00Z"
  },
  status_code: 200
}
```

---

## Magic Links

**Documentation**: [Stytch Magic Links Guide](https://stytch.com/docs/guides/magic-links/email-magic-links/api)

### 8. `magicLinks.email.loginOrCreate()`

**Purpose**: Create session using Magic Links as fallback authentication method

**Documentation**: [Stytch Magic Links API](https://stytch.com/docs/api/log-in-or-create-user-by-email)

**Usage in Code**:
```javascript
const sessionResult = await stytchClient.magicLinks.email.loginOrCreate({
  email: sessionData.email,
  session_duration_minutes: 60 * 24 * 7 // 7 days
});
```

**Implementation Files**:
- `services/authService.js` - `completeLogin()` method

**Parameters**:
- `email`: String (valid email format, required)
- `session_duration_minutes`: Number (5-10080, default: 5)
- `login_magic_link_url`: String (optional redirect URL)
- `signup_magic_link_url`: String (optional redirect URL)

**Response**:
```javascript
{
  user_id: "user-test-16d9ba61-97a1-4ba4-9720-b03761dc50c6",
  method_id: "email-test-81bf03a8-86e1-4d95-bd44-bb3495224953",
  email_id: "email-test-81bf03a8-86e1-4d95-bd44-bb3495224953",
  user_created: false,
  session_token: "WJtR5BCy38Szd5AfoDpf0iqFVuT4RPL96PvgNjSWy...",
  session_jwt: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  status_code: 200
}
```

---

## Configuration

**Documentation**: [Stytch Project Configuration](https://stytch.com/docs/home)

### Environment Variables

```bash
# Required Stytch Configuration
STYTCH_PROJECT_ID=project-test-11111111-1111-1111-1111-111111111111
STYTCH_SECRET=secret-test-22222222-2222-2222-2222-222222222222
STYTCH_ENVIRONMENT=test  # or 'live' for production

# Optional Configuration
STYTCH_PROJECT_URL=https://test.stytch.com/v1
```

### Stytch Client Initialization

**Documentation**: [Stytch Node.js SDK Setup](https://stytch.com/docs/sdks/javascript-node)

**File**: `config/stytch.js`

```javascript
import { Client, envs } from 'stytch';

const stytchClient = new Client({
  project_id: process.env.STYTCH_PROJECT_ID,
  secret: process.env.STYTCH_SECRET,
  env: process.env.STYTCH_ENVIRONMENT === 'live' ? envs.live : envs.test,
});

export default stytchClient;
```

---

## Error Handling

**Documentation**: [Stytch Error Handling Guide](https://stytch.com/docs/guides/errors)

### Common Errors

```javascript
// Phone number format error
{
  error_type: "phone_number_invalid",
  error_message: "Phone number format is invalid",
  status_code: 400
}

// Email format error  
{
  error_type: "email_invalid",
  error_message: "Email format is invalid",
  status_code: 400
}

// OTP expired
{
  error_type: "otp_expired",
  error_message: "OTP has expired",
  status_code: 400
}

// Invalid OTP
{
  error_type: "otp_invalid",
  error_message: "OTP is invalid",
  status_code: 400
}

// Session expired
{
  error_type: "session_expired",
  error_message: "Session has expired",
  status_code: 401
}

// Rate limit exceeded
{
  error_type: "rate_limit_exceeded",
  error_message: "Rate limit exceeded",
  status_code: 429
}
```

### Error Handling Implementation

```javascript
try {
  const result = await stytchClient.otps.sms.loginOrCreate({
    phone_number: phoneNumber,
    expiration_minutes: 5
  });
} catch (error) {
  // Handle specific Stytch errors
  if (error.error_type === 'phone_number_invalid') {
    throw new Error('Phone number format is invalid or not supported');
  }
  if (error.error_type === 'rate_limit_exceeded') {
    throw new Error('Too many requests. Please try again later.');
  }
  if (error.error_type === 'otp_expired') {
    throw new Error('OTP has expired. Please request a new one.');
  }
  if (error.error_type === 'otp_invalid') {
    throw new Error('Invalid OTP code. Please try again.');
  }
  throw new Error(`Stytch error: ${error.error_message}`);
}
```

---

## Rate Limiting

**Documentation**: [Stytch Rate Limiting Guide](https://stytch.com/docs/guides/rate-limiting)

### Application-Level Rate Limiting

**Implementation**: `services/authService.js`

```javascript
// OTP sending rate limits
this.OTP_RATE_LIMIT = 3; // 3 attempts per 5 minutes
this.rateLimitStore = new Map();

// Check rate limiting before sending OTP
const rateLimitKey = `${medium}:${value}`;
const rateLimitData = this.rateLimitStore.get(rateLimitKey) || { 
  count: 0, 
  resetTime: now + 5 * 60 * 1000 
};

if (now < rateLimitData.resetTime && rateLimitData.count >= this.OTP_RATE_LIMIT) {
  throw new Error('Too many OTP requests. Please try again in 5 minutes.');
}
```

### Stytch Rate Limits

- **OTP Requests**: 10 per minute per phone/email
- **OTP Verification**: 5 attempts per OTP
- **User Search**: 100 per minute
- **Session Validation**: 1000 per minute
- **Magic Link Requests**: 5 per minute per email

---

## Security Best Practices

**Documentation**: [Stytch Security Best Practices](https://stytch.com/docs/guides/security)

### 1. Input Validation

```javascript
// Phone number validation
const phoneRegex = /^\+[1-9]\d{1,14}$/;
if (!phoneRegex.test(phoneNumber)) {
  throw new Error('Invalid phone number format. Use international format: +1234567890');
}

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}
```

### 2. Session Security

```javascript
// Store session with expiration
const sessionData = {
  sessionId,
  phoneNumber,
  email,
  phoneVerified: false,
  emailVerified: false,
  createdAt: Date.now(),
  expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
  phoneOtpAttempts: 0,
  emailOtpAttempts: 0
};

// Clean up expired sessions
this.verificationSessions.set(sessionId, sessionData);
```

### 3. Custom Session Fallback

```javascript
// Create custom session when Magic Links fail
const customSessionToken = `stytch_verified_${sessionId}_${timestamp}`;
const userInfo = {
  user_id: user.user_id,
  email: sessionData.email,
  phone: sessionData.phoneNumber,
  verified_at: new Date().toISOString(),
  expires_at: new Date(timestamp + (60 * 24 * 7 * 60 * 1000)).toISOString(),
  session_id: sessionId,
  created_at: user.created_at,
  status: user.status
};

// Store custom session for validation
this.customSessions = this.customSessions || new Map();
this.customSessions.set(customSessionToken, userInfo);
```

### 4. OTP Attempt Limiting

```javascript
// Track OTP verification attempts
const attemptField = medium === 'phone' ? 'phoneOtpAttempts' : 'emailOtpAttempts';
sessionData[attemptField]++;

if (sessionData[attemptField] > this.MAX_OTP_ATTEMPTS) {
  this.verificationSessions.delete(sessionId);
  throw new Error('Too many failed attempts. Please start over.');
}
```

---

## Integration Testing

**Documentation**: [Stytch Test Environment Guide](https://stytch.com/docs/guides/testing/e2e)

### Test Environment Setup

```javascript
// Use Stytch test environment
const testPhoneNumber = "+15005550001"; // Stytch test number
const testEmail = "test@stytch.com";     // Stytch test email
const testOTP = "000000";                // Always valid in test env
```

### Example Test Cases

```javascript
describe('Stytch Integration', () => {
  it('should check phone availability', async () => {
    const result = await authService.checkAvailability('phone', '+15005550001');
    expect(result.available).toBe(false); // Test number exists
  });

  it('should send and verify OTP', async () => {
    const sessionId = await authService.startVerificationSession(
      '+15005550001', 
      'test@stytch.com'
    );
    
    const sendResult = await authService.sendVerificationOTP(sessionId.sessionId, 'phone', 'sms');
    expect(sendResult.methodId).toBeDefined();
    
    const verifyResult = await authService.verifyVerificationOTP(
      sessionId.sessionId, 
      'phone', 
      '000000'
    );
    expect(verifyResult.phoneVerified).toBe(true);
  });

  it('should complete login after verification', async () => {
    // Assume phone and email are verified
    const loginResult = await authService.completeLogin(sessionId);
    expect(loginResult.session_token).toBeDefined();
    expect(loginResult.user.id).toBeDefined();
  });

  it('should validate session token', async () => {
    const validationResult = await authService.validateSession(sessionToken);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.user).toBeDefined();
  });
});
```

---

## Monitoring and Logging

**Documentation**: [Stytch Analytics & Monitoring](https://stytch.com/docs/home)

### Activity Logging

```javascript
// Log Stytch operations
console.log(`📱 Sending OTP to ${medium}:${value} via ${channel} for session ${sessionId}`);
console.log(`🔍 Stytch OTP Response Status: ${otpResult.status_code}`);
console.log(`✅ OTP sent successfully! Method ID: ${methodId}`);
console.log(`🎉 Completing login for verified session: ${sessionId}`);
console.log(`🔗 Creating session via Magic Links`);
console.log(`🔄 Magic Links failed, creating enhanced custom verified session`);
```

### Error Monitoring

```javascript
// Monitor Stytch errors
console.error(`❌ Stytch OTP Error:`, stytchError);
console.error(`❌ Error verifying ${medium} OTP: ${error.message}`);
console.error(`❌ Error completing login: ${error.message}`);
console.error(`❌ Error in wallet retrieval: ${error.message}`);
```

### Performance Monitoring

```javascript
// Track API response times
const startTime = Date.now();
const result = await stytchClient.otps.sms.loginOrCreate(params);
const responseTime = Date.now() - startTime;
console.log(`⏱️ Stytch SMS OTP took ${responseTime}ms`);
```

---

## Troubleshooting

**Documentation**: [Stytch Troubleshooting Guide](https://stytch.com/docs/home)

### Common Issues and Solutions

1. **Phone Number Format Issues**
   - Ensure phone numbers are in E.164 format (+1234567890)
   - Validate format before sending to Stytch

2. **OTP Not Received**
   - Check rate limits (both application and Stytch)
   - Verify phone number is valid and reachable
   - For testing, use Stytch test numbers

3. **Session Expired Errors**
   - Implement proper session refresh logic
   - Handle expired sessions gracefully
   - Use custom session fallback when needed

4. **Magic Link Failures**
   - Implement custom session creation as fallback
   - Store session data securely
   - Validate custom sessions properly

### Debug Mode

```javascript
// Enable debug logging
const debug = process.env.NODE_ENV === 'development';

if (debug) {
  console.log('Debug: Stytch request params:', params);
  console.log('Debug: Stytch response:', result);
}
```

---

## Documentation Links

- **Official Stytch Documentation**: https://stytch.com/docs/home
- **Consumer Authentication**: https://stytch.com/docs/guides/quickstart/consumer/api
- **OTP Authentication**: https://stytch.com/docs/guides/passcodes/api
- **Session Management**: https://stytch.com/docs/guides/sessions/backend
- **Magic Links**: https://stytch.com/docs/guides/magic-links/email-magic-links/api
- **User Management**: https://stytch.com/docs/api/search-users
- **API Reference**: https://stytch.com/docs/api/authenticate-otp

---

## Summary

This document covers all Stytch authentication resources used in the 7awell application:

### **Core Features**:
- **User Management**: Search and creation of users with availability checking
- **Multi-Factor OTP**: SMS, WhatsApp, and Email verification with comprehensive error handling
- **Session Management**: Token validation, refresh, and custom session fallback
- **Magic Links**: Fallback authentication method for session creation
- **Security**: Rate limiting, input validation, attempt tracking, and session security
- **Integration**: Custom session management with Supabase user mapping

### **Key Benefits**:
- **Robust Authentication**: Multi-step verification ensures high security
- **Fallback Mechanisms**: Custom sessions when primary methods fail
- **Rate Protection**: Prevents abuse with comprehensive rate limiting
- **Error Resilience**: Detailed error handling for all scenarios
- **Testing Support**: Complete test environment configuration
- **Monitoring**: Comprehensive logging and debugging capabilities

This implementation provides a secure, scalable, and maintainable authentication system for the 7awell financial application. 