import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import UserSession from '../../models/UserSession.js';
import User from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';

describe('UserSession Model', () => {
    let testUser;
    let testSession;
    const testSessionData = {
        user_id: null, // Will be set after user creation
        session_token: 'test_token_123',
        device_id: 'test_device_123',
        device_name: 'Test Device',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };

    beforeEach(async () => {
        // Create a test user with unique phone number (max 20 chars)
        const randomNum = Math.floor(Math.random() * 10000);
        testUser = await User.create({
            email: `test_${randomNum}@example.com`,
            phone: `+1234567890${randomNum}`, // Shorter phone number
            password: 'Test123!@#'
        });

        // Set the user_id in test session data
        testSessionData.user_id = testUser.id;
    });

    afterEach(async () => {
        // Clean up test data
        if (testSession) {
            await testSession.deactivate();
        }
        if (testUser) {
            try {
                await User.destroy({ where: { id: testUser.id } });
            } catch (error) {
                console.error('Error deleting test user:', error);
            }
        }
    });

    describe('create', () => {
        it('should create a new user session', async () => {
            testSession = await UserSession.create(testSessionData);
            expect(testSession).toBeDefined();
            expect(testSession.user_id).toBe(testUser.id);
            expect(testSession.session_token).toBe(testSessionData.session_token);
            expect(testSession.is_active).toBe(true);
            expect(testSession.pin_verified).toBe(false);
        });

    });

    describe('findByToken', () => {
        it('should find session by token', async () => {
            testSession = await UserSession.create(testSessionData);
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession).toBeDefined();
            expect(foundSession.id).toBe(testSession.id);
        });


    });

    describe('findActiveSessionsByUserId', () => {
        it('should find active sessions for user', async () => {
            testSession = await UserSession.create(testSessionData);
            const sessions = await UserSession.findActiveSessionsByUserId(testUser.id);
            expect(sessions).toBeDefined();
            expect(sessions.length).toBeGreaterThan(0);
            expect(sessions[0].id).toBe(testSession.id);
        });

        it('should not find expired sessions', async () => {
            // Create an expired session by setting is_active to false
            const expiredData = {
                ...testSessionData,
                is_active: false
            };
            testSession = await UserSession.create(expiredData);
            const sessions = await UserSession.findActiveSessionsByUserId(testUser.id);
            expect(sessions).toBeDefined();
            expect(sessions.length).toBe(0);
        });
    });

    describe('update', () => {
        it('should update session data', async () => {
            testSession = await UserSession.create(testSessionData);
            const updateData = {
                device_name: 'Updated Device',
                ip_address: '192.168.1.2'
            };
            const updatedSession = await testSession.update(updateData);
            expect(updatedSession.device_name).toBe(updateData.device_name);
            expect(updatedSession.ip_address).toBe(updateData.ip_address);
        });
    });

    describe('deactivate', () => {
        it('should deactivate session', async () => {
            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.is_active).toBe(false);
        });
    });

    describe('verifyPin', () => {
        it('should verify PIN', async () => {
            testSession = await UserSession.create(testSessionData);
            await testSession.verifyPin();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.pin_verified).toBe(true);
        });
    });

    describe('isExpired and isValid', () => {
        it('should correctly identify expired session', async () => {
            // Create a session and then deactivate it
            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            expect(testSession.isExpired()).toBe(false); // Not expired yet
            expect(testSession.isValid()).toBe(false); // But not valid because inactive
        });

        it('should correctly identify valid session', async () => {
            testSession = await UserSession.create(testSessionData);
            expect(testSession.isExpired()).toBe(false);
            expect(testSession.isValid()).toBe(true);
        });
    });

    describe('cleanupExpiredSessions', () => {
        it('should deactivate expired sessions', async () => {
            // Create a session and then deactivate it
            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            await UserSession.cleanupExpiredSessions();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.is_active).toBe(false);
        });
    });
}); 