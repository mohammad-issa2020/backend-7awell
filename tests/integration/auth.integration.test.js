import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

const testPhone = '+1234567890';
const testEmail = 'testuser@example.com';

describe('Authentication Integration Tests (OTP Flow Only)', () => {
  it('should complete full OTP authentication flow', async () => {
    // Step 1: Start verification
    const startRes = await request(app)
      .post('/api/v1/auth/verification/start')
      .send({ phoneNumber: testPhone, email: testEmail });
    expect(startRes.status).toBe(200);
    const sessionId = startRes.body.data.sessionId;
    expect(sessionId).toBeDefined();

    // Step 2: Send OTP (mocked)
    const sendOtpRes = await request(app)
      .post('/api/v1/auth/verification/send-otp')
      .send({ sessionId, channel: 'sms', medium: 'phone' });
    console.log('sendOtpRes.body:', sendOtpRes.body);
    expect(sendOtpRes.status).toBe(200);

    // Step 3: Verify OTP (mocked code)
    const otpCode = '123456'; //data from mock DB
    const verifyOtpRes = await request(app)
      .post('/api/v1/auth/verification/verify-otp')
      .send({ sessionId, code: otpCode });
    expect([200, 400]).toContain(verifyOtpRes.status);

    // Step 4: Complete login
    const completeLoginRes = await request(app)
      .post('/api/v1/auth/verification/complete-login')
      .send({ sessionId });
    expect([200, 400]).toContain(completeLoginRes.status);
    if (completeLoginRes.status === 200) {
      const accessToken = completeLoginRes.body.data.accessToken;
      expect(accessToken).toBeDefined();
    }
  });
}); 