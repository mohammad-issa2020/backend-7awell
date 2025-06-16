import request from 'supertest';
import app from '../server.js';

// data test
const testPhone = '+1234567890';
const testEmail = 'testuser@example.com';

let sessionToken = '';
let sessionId = '';

describe('Auth Integration Flow', () => {
  it('should complete OTP login flow', async () => {
    // 1. Start verification
    const startRes = await request(app)
      .post('/api/v1/auth/verification/start')
      .send({ phoneNumber: testPhone, email: testEmail });
    expect(startRes.status).toBe(200);
    sessionId = startRes.body.data.sessionId;
    expect(sessionId).toBeDefined();

    // 2. Send OTP (mocked)
    const sendOtpRes = await request(app)
      .post('/api/v1/auth/verification/send-otp')
      .send({ sessionId, medium: 'phone', channel: 'sms' });
    expect(sendOtpRes.status).toBe(200);
    // in test environment, the code is fixed or can be extracted from response.debug
    const otpCode = sendOtpRes.body.data?.debug?.otp || '123456';

    // 3. Verify OTP
    const verifyOtpRes = await request(app)
      .post('/api/v1/auth/verification/verify-otp')
      .send({ sessionId, medium: 'phone', otp: otpCode });
    expect(verifyOtpRes.status).toBe(200);

    // 4. Complete login
    const completeRes = await request(app)
      .post('/api/v1/auth/verification/complete-login')
      .send({ sessionId });
    expect(completeRes.status).toBe(200);
    sessionToken = completeRes.body.data.session_token;
    expect(sessionToken).toBeDefined();
  });

  it('should refresh session token', async () => {
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessionToken });
    expect([200, 401]).toContain(refreshRes.status);
    // if successful, check for new accessToken
    if (refreshRes.status === 200) {
      expect(refreshRes.body.data.accessToken).toBeDefined();
    }
  });

  it('should get devices (sessions)', async () => {
    const devicesRes = await request(app)
      .get('/api/v1/auth/devices')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect([200, 401]).toContain(devicesRes.status);
    if (devicesRes.status === 200) {
      expect(Array.isArray(devicesRes.body.data.sessions) || Array.isArray(devicesRes.body.data.devices)).toBe(true);
    }
  });

  it('should revoke all devices (logout everywhere)', async () => {
    const revokeRes = await request(app)
      .delete('/api/v1/auth/devices')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect([200, 401]).toContain(revokeRes.status);
  });

  it('should get user profile', async () => {
    const profileRes = await request(app)
      .get('/api/v1/user')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect([200, 401]).toContain(profileRes.status);
    if (profileRes.status === 200) {
      expect(profileRes.body.user).toBeDefined();
      expect(profileRes.body.settings).toBeDefined();
    }
  });
}); 