# Sequential Authentication Flow

This document describes the new sequential authentication flow that requires phone verification first, followed by email verification.

## Overview

The sequential authentication flow follows these steps:

1. **Phone Input & OTP**: User enters phone number → system sends OTP → user verifies phone OTP
2. **Email Input & OTP**: User enters email → system sends OTP → user verifies email OTP  
3. **Token Generation**: System returns authentication token and user data

## API Endpoints

### Step 1: Start Phone Login

**POST** `/auth/login/phone`

Send OTP to the provided phone number.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
    "step": "phone_verification",
    "phoneAvailable": true,
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "message": "New account will be created. Phone OTP sent."
  },
  "message": "OTP sent to phone number successfully"
}
```

### Step 2: Verify Phone OTP

**POST** `/auth/login/phone/verify`

Verify the OTP sent to the phone number.

**Request Body:**
```json
{
  "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
    "step": "email_input",
    "phoneVerified": true,
    "message": "Phone verified successfully. Please provide your email address."
  },
  "message": "Phone OTP verified successfully"
}
```

### Step 3: Start Email Login

**POST** `/auth/login/email`

Send OTP to the provided email address (requires phone verification first).

**Request Body:**
```json
{
  "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
    "step": "email_verification",
    "emailAvailable": true,
    "message": "Email OTP sent for new account creation."
  },
  "message": "OTP sent to email successfully"
}
```

### Step 4: Verify Email OTP and Complete Login

**POST** `/auth/login/email/verify`

Verify the email OTP and complete the authentication process.

**Request Body:**
```json
{
  "sessionId": "seq_auth_12345678-1234-1234-1234-123456789012",
  "otp": "654321"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-supabase-id",
      "stytch_user_id": "user-stytch-id",
      "phoneNumber": "+1234567890",
      "email": "user@example.com",
      "created_at": "2024-01-01T12:00:00.000Z",
      "status": "active"
    },
    "session": {
      "session_id": "session-12345",
      "session_token": "stytch-session-token",
      "session_jwt": "encoded-jwt-token",
      "expires_at": "2024-01-02T12:00:00.000Z"
    },
    "wallet": {
      "success": true,
      "isNewWallet": false,
      "wallet": {
        "id": "wallet-id",
        "address": "0x...",
        "network": "ethereum",
        "provider": "web3auth"
      }
    },
    "isNewUser": true,
    "message": "Login completed successfully"
  },
  "message": "Login completed successfully"
}
```

## Flow States

The session progresses through these states:

1. **`phone_verification`**: Waiting for phone OTP verification
2. **`email_input`**: Phone verified, waiting for email input
3. **`email_verification`**: Email provided, waiting for email OTP verification
4. **`completed`**: Both verifications complete, session cleaned up

## Error Handling

### Common Error Responses

**Invalid Session:**
```json
{
  "status": "error",
  "message": "Phone OTP verification failed",
  "errorCode": "PHONE_OTP_VERIFICATION_FAILED",
  "error": "Invalid or expired session"
}
```

**Session Expired:**
```json
{
  "status": "error",
  "message": "Phone OTP verification failed", 
  "errorCode": "PHONE_OTP_VERIFICATION_FAILED",
  "error": "Session expired"
}
```

**Invalid Step:**
```json
{
  "status": "error",
  "message": "Failed to send email OTP",
  "errorCode": "EMAIL_OTP_SEND_FAILED", 
  "error": "Invalid step. Phone must be verified first."
}
```

**Maximum Attempts Exceeded:**
```json
{
  "status": "error",
  "message": "Phone OTP verification failed",
  "errorCode": "PHONE_OTP_VERIFICATION_FAILED",
  "error": "Maximum phone OTP attempts exceeded"
}
```

**Rate Limiting:**
```json
{
  "status": "error",
  "message": "Failed to send phone OTP",
  "errorCode": "PHONE_OTP_SEND_FAILED",
  "error": "Too many login attempts. Please try again later."
}
```

## Validation Rules

### Phone Number
- Format: `+[country_code][number]` (E.164 format)
- Example: `+1234567890`
- Pattern: `/^(\+|%2B|\s)[1-9]\d{1,14}$/`

### Email
- Standard email validation
- Example: `user@example.com`

### OTP
- 6-digit numeric code
- Pattern: `/^\d{6}$/`
- Example: `123456`

### Session ID  
- UUID v4 format with prefix `seq_auth_`
- Example: `seq_auth_12345678-1234-1234-1234-123456789012`

## Security Features

1. **Rate Limiting**: Prevents abuse by limiting attempts per time window
2. **Session Expiry**: Sessions expire after 5 minutes by default
3. **Attempt Limits**: Maximum 5 OTP attempts per session
4. **Step Validation**: Each step must be completed in sequence
5. **Secure OTP Delivery**: Uses Stytch for secure OTP delivery

## Frontend Integration Example

```javascript
class SequentialAuth {
  constructor() {
    this.sessionId = null;
    this.currentStep = null;
  }

  async startPhoneLogin(phoneNumber) {
    const response = await fetch('/auth/login/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      this.sessionId = data.data.sessionId;
      this.currentStep = data.data.step;
    }
    
    return data;
  }

  async verifyPhoneOTP(otp) {
    const response = await fetch('/auth/login/phone/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: this.sessionId, 
        otp 
      })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      this.currentStep = data.data.step;
    }
    
    return data;
  }

  async startEmailLogin(email) {
    const response = await fetch('/auth/login/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: this.sessionId, 
        email 
      })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      this.currentStep = data.data.step;
    }
    
    return data;
  }

  async verifyEmailOTPAndComplete(otp) {
    const response = await fetch('/auth/login/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: this.sessionId, 
        otp 
      })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      // Save session token for authenticated requests
      localStorage.setItem('session_token', data.data.session.session_token);
      this.sessionId = null;
      this.currentStep = 'completed';
    }
    
    return data;
  }
}

// Usage example
const auth = new SequentialAuth();

// Step 1: Phone
const phoneResult = await auth.startPhoneLogin('+1234567890');
// User receives SMS OTP

// Step 2: Phone OTP  
const phoneVerifyResult = await auth.verifyPhoneOTP('123456');

// Step 3: Email
const emailResult = await auth.startEmailLogin('user@example.com');
// User receives email OTP

// Step 4: Email OTP & Complete
const completeResult = await auth.verifyEmailOTPAndComplete('654321');
// User is now authenticated
```

## Testing

Run the sequential authentication tests:

```bash
npm test auth.sequential.test.js
```

Note: Tests require mocking of Stytch OTP verification for full integration testing.

## Configuration

The authentication service can be configured with these parameters:

- `OTP_EXPIRY`: OTP expiration time (default: 5 minutes)
- `MAX_OTP_ATTEMPTS`: Maximum OTP attempts per session (default: 5)
- `OTP_RATE_LIMIT`: Rate limit attempts (default: 3 per 5 minutes)

## Migration from Existing Flow

If you're migrating from the simultaneous authentication flow (phone + email together), you can still use the existing endpoints:

- **Simultaneous**: `/auth/login` and `/auth/verify` (sends OTP to both phone and email)
- **Sequential**: `/auth/login/phone` → `/auth/login/phone/verify` → `/auth/login/email` → `/auth/login/email/verify`

Both flows are supported simultaneously. 