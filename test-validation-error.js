import express from 'express';
import { validateBody, phoneLoginSchema } from './middleware/validation.js';
import { authActivityLogger } from './middleware/activityMiddleware.js';
import logger from './utils/logger.js';
import BaseResponse from './utils/baseResponse.js';

const app = express();
app.use(express.json());

// Test endpoint mimicking phone login validation
app.post('/test-validation', 
  validateBody(phoneLoginSchema),
  authActivityLogger('Test Phone Login'),
  (req, res) => {
    logger.logAuth('Phone login validation passed', 'info', {
      phoneNumber: req.body.phoneNumber ? `***${req.body.phoneNumber.slice(-4)}` : 'undefined'
    });
    
    return BaseResponse.success(res, null, 'Validation passed');
  }
);

// Error handler to catch any unhandled errors
app.use((error, req, res, next) => {
  logger.logError(error, {
    message: 'Unhandled error in test validation',
    endpoint: req.path,
    body: req.body
  });
  
  return BaseResponse.error(res, 'Internal error', 500, error.message);
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`🔍 Test validation server running on port ${PORT}`);
  console.log(`📝 Testing with invalid phone number...`);
  
  // Test with invalid phone number
  setTimeout(() => {
    testValidationError();
  }, 1000);
});

async function testValidationError() {
  try {
    const response = await fetch(`http://localhost:${PORT}/test-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: "invalid-phone-number" // This should trigger validation error
      })
    });
    
    const result = await response.json();
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📋 Response Body:`, JSON.stringify(result, null, 2));
    
    // Test with valid phone number
    console.log(`\n✅ Testing with valid phone number...`);
    
    const validResponse = await fetch(`http://localhost:${PORT}/test-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: "+1234567890"
      })
    });
    
    const validResult = await validResponse.json();
    
    console.log(`\n📊 Valid Response Status: ${validResponse.status}`);
    console.log(`📋 Valid Response Body:`, JSON.stringify(validResult, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Close server after tests
    setTimeout(() => {
      server.close(() => {
        console.log('\n🏁 Test completed. Checking logs...');
        process.exit(0);
      });
    }, 2000);
  }
} 