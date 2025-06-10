# 7awel Crypto Wallet - Authentication System Implementation Guide

## Overview
This guide covers the complete implementation of the authentication system for the 7awel crypto wallet backend using Node.js, Express.js, JWT tokens, and Stytch for OTP verification.

## Features Implemented
- ✅ Phone number and email availability check
- ✅ OTP sending via SMS, WhatsApp, and Email using Stytch
- ✅ OTP verification with rate limiting and attempt tracking
- ✅ Secure login with JWT tokens (access + refresh)
- ✅ Session management with Redis
- ✅ Device/session tracking
- ✅ Token refresh mechanism
- ✅ Logout and session revocation
- ✅ Input validation with Joi
- ✅ Rate limiting for security
- ✅ Consistent API response format
- ✅ Comprehensive error handling

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT (jsonwebtoken)
- **OTP Service**: Stytch (SMS, WhatsApp, Email)
- **Session Store**: Redis (ioredis)
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit
- **Security**: helmet, bcryptjs

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Check Availability
```http
GET /api/v1/auth/check-availability?medium={phone|email}&value={value}
```
**Response:**
```json
{
  "statusCode": 200,
  "message": "Phone number availability checked",
  "data": {
    "available": true
  },
  "traceId": "uuid"
}
```

#### 2. Send OTP
```http
POST /api/v1/auth/otp/send
Content-Type: application/json

{
  "medium": "phone",
  "value": "+1234567890",
  "channel": "whatsapp"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "message": "OTP sent successfully via whatsapp",
  "data": {
    "requiresOtp": true,
    "expires": 1703001600000,
    "channel": "whatsapp"
  },
  "traceId": "uuid"
}
```

#### 3. Verify OTP
```http
POST /api/v1/auth/otp/verify
Content-Type: application/json

{
  "medium": "phone",
  "value": "+1234567890",
  "otp": "123456"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "message": "OTP verified successfully",
  "data": {
    "valid": true
  },
  "traceId": "uuid"
}
```

#### 4. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "+1234567890",
      "phoneNumber": "+1234567890",
      "email": "user@example.com"
    }
  },
  "traceId": "uuid"
}
```

#### 5. Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints (Authentication Required)

#### 6. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

#### 7. Get Active Devices
```http
GET /api/v1/auth/devices
Authorization: Bearer {accessToken}
```

#### 8. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

#### 9. Revoke All Sessions
```http
DELETE /api/v1/auth/devices
Authorization: Bearer {accessToken}
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file with the following variables:

```env
# Environment
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-here-change-this-in-production

# Stytch Configuration
STYTCH_PROJECT_ID=your-stytch-project-id
STYTCH_SECRET=your-stytch-secret-key

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Stytch Setup
1. Sign up at [Stytch](https://stytch.com)
2. Create a new project
3. Get your Project ID and Secret from the dashboard
4. Configure OTP settings in the Stytch dashboard

### 4. Redis Setup
Install and run Redis:
```bash
# On macOS
brew install redis
brew services start redis

# On Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

## Security Features

### Rate Limiting
- **OTP Requests**: 3 per 5 minutes per endpoint
- **Login Attempts**: 5 per 15 minutes
- **General API**: 100 per 15 minutes

### JWT Token Security
- **Access Token**: 1 hour expiry
- **Refresh Token**: 7 days expiry
- **Secure signing** with strong secrets
- **Token type validation**

### OTP Security
- **5-minute expiration**
- **Maximum 5 verification attempts**
- **Rate limiting on sending**
- **Automatic cleanup after verification**

### Session Management
- **Redis-based session storage**
- **Device tracking**
- **Session invalidation**
- **Automatic cleanup**

## Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AVAILABILITY_CHECK_FAILED` | Failed to check availability |
| `OTP_SEND_FAILED` | Failed to send OTP |
| `OTP_RATE_LIMIT_EXCEEDED` | Too many OTP requests |
| `INVALID_OTP` | Invalid OTP code |
| `OTP_EXPIRED` | OTP session expired |
| `OTP_MAX_ATTEMPTS_EXCEEDED` | Too many verification attempts |
| `OTP_VERIFICATION_REQUIRED` | Phone/email not verified |
| `LOGIN_FAILED` | Login process failed |
| `INVALID_TOKEN` | Invalid JWT token |
| `TOKEN_EXPIRED` | JWT token expired |
| `SESSION_EXPIRED` | Session not found or expired |
| `UNAUTHORIZED` | Authentication required |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |

## File Structure

```
├── config/
│   ├── redis.js           # Redis configuration
│   └── stytch.js          # Stytch configuration
├── controllers/
│   └── authController.js  # Authentication endpoints
├── middleware/
│   ├── authMiddleware.js  # JWT authentication middleware
│   └── validation.js      # Input validation schemas
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   └── index.js           # Main routes
├── services/
│   └── authService.js     # Authentication business logic
├── utils/
│   └── baseResponse.js    # Standardized API responses
└── server.js              # Main application file
```

## Testing

### Manual Testing with cURL

1. **Check Availability:**
```bash
curl "http://localhost:3000/api/v1/auth/check-availability?medium=phone&value=%2B1234567890"
```

2. **Send OTP:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"medium":"phone","value":"+1234567890","channel":"sms"}'
```

3. **Verify OTP:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"medium":"phone","value":"+1234567890","otp":"123456"}'
```

4. **Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'
```

## Next Steps

1. **Database Integration**: Replace Redis simulation with actual user database
2. **User Profile Management**: Add user profile endpoints
3. **Password/PIN Support**: Add password-based authentication option
4. **2FA**: Add additional two-factor authentication methods
5. **Audit Logging**: Add comprehensive audit logging
6. **API Documentation**: Generate Swagger/OpenAPI documentation
7. **Unit Tests**: Add comprehensive test coverage
8. **Monitoring**: Add application monitoring and alerting

## Support

For questions about this implementation, please refer to:
- Stytch Documentation: https://stytch.com/docs
- JWT Documentation: https://jwt.io/introduction
- Redis Documentation: https://redis.io/documentation 