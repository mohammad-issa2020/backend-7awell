# 7awel Backend - Postman Quick Start Guide

## Quick Import Instructions

### Step 1: Import Collection
1. Open Postman
2. Click "Import" button (top left)
3. Drag and drop the `7awel-backend-postman-collection.json` file
4. Or click "Upload Files" and select the JSON file
5. Click "Import"

### Step 2: Set Up Environment
The collection includes a pre-configured environment. After import:
1. Click the environment dropdown (top right)
2. Select "7awel Backend Development"
3. Update these variables if needed:
   - `baseUrl`: Your server URL (default: http://localhost:3000)
   - `phoneNumber`: Test phone number (default: +1234567890)
   - `email`: Test email (default: test@example.com)

### Step 3: Start Your Server
Make sure your backend server is running:
```bash
npm run dev
```

### Step 4: Test the APIs

#### Basic Testing Flow:
1. **Health Check** - Verify server is running
2. **Check Availability** - Test phone/email availability
3. **Send OTP** - Send OTP to your test phone/email
4. **Verify OTP** - Enter the received OTP code
5. **Login** - Login with verified credentials (auto-saves tokens)
6. **Get Current User** - Test protected endpoint

#### Authentication Flow:
```
Check Availability → Send OTP → Verify OTP → Login → Access Protected APIs
```

## Key Features

### Automatic Token Management
- Login request automatically saves access and refresh tokens
- Refresh token request automatically updates access token
- Protected endpoints use saved tokens automatically

### Environment Variables
- All URLs use environment variables for easy environment switching
- Tokens are automatically managed
- Test data (phone, email) can be easily changed

### Organized Structure
- **Root Endpoints**: Basic server info
- **Authentication**: Public auth endpoints
- **Protected Auth**: Token-required endpoints  
- **Tests**: CRUD operations for test data

## Rate Limits to Remember
- **OTP Send**: 3 requests per 5 minutes
- **Login**: 5 requests per 15 minutes
- **General**: 100 requests per 15 minutes

## Quick Test Scenarios

### Scenario 1: New User Registration
1. Check Availability (Phone) ✓
2. Send OTP (SMS/WhatsApp) ✓
3. Verify OTP ✓
4. Login ✓
5. Get Current User ✓

### Scenario 2: Token Management
1. Login (saves tokens) ✓
2. Get Current User (uses access token) ✓
3. Refresh Token (updates access token) ✓
4. Logout ✓

### Scenario 3: Test Data Management
1. Get All Tests ✓
2. Create Test ✓
3. Get Test by ID ✓
4. Update Test ✓
5. Delete Test ✓

## Troubleshooting

### Common Issues:
1. **Server not running**: Make sure backend is running on port 3000
2. **Invalid tokens**: Use Login request to get fresh tokens
3. **Rate limits**: Wait for the rate limit window to reset
4. **OTP not received**: Check Stytch configuration in backend

### Environment Issues:
- Ensure environment is selected in Postman
- Check that baseUrl points to your running server
- Verify phone number format includes country code

## API Response Format
All APIs return consistent response format:
```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": { /* response data */ },
  "traceId": "unique-trace-id"
}
```

## Next Steps
1. Try all endpoints in order
2. Test error scenarios (invalid data, expired tokens)
3. Check rate limiting behavior
4. Test with different phone numbers and emails
5. Explore the test data CRUD operations

For detailed API documentation, see `POSTMAN_API_COLLECTION.md` 