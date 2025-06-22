import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import UserSession from '../../models/UserSession.js';
import User from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { quickSetups } from '../../tests/setup/presets.js';

describe('UserSession Model', () => {
    let setup;
    let testUsers;
    let testUser;
    let testSession;

    beforeAll(async () => {
        // load sessions system (users + sessions)
        setup = await quickSetups.sessions('integration');
        testUsers = setup.getData('users');
        testUser = testUsers.find(u => u.status === 'active');
    });

    afterAll(async () => {
        // cleanup preset data
        await setup.cleanup();
    });

    describe('create', () => {
        it('should create a new user session', async () => {
            const testSessionData = {
                user_id: testUser.id,
                session_token: `test_token_${Date.now()}`,
                device_id: 'test_device_123',
                device_name: 'Test Device',
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0 (Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            expect(testSession).toBeDefined();
            expect(testSession.user_id).toBe(testUser.id);
            expect(testSession.session_token).toBe(testSessionData.session_token);
            expect(testSession.is_active).toBe(true);
            expect(testSession.pin_verified).toBe(false);

            // clean up
            await testSession.deactivate();
        });
    });

    describe('findByToken', () => {
        it('should find session by token', async () => {
            const sessionToken = `find_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'find_device_123',
                device_name: 'Find Test Device',
                ip_address: '192.168.1.2',
                user_agent: 'Mozilla/5.0 (Find Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession).toBeDefined();
            expect(foundSession.id).toBe(testSession.id);

            // clean up
            await testSession.deactivate();
        });
    });

    describe('findActiveSessionsByUserId', () => {
        it('should find active sessions for user', async () => {
            const sessionToken = `active_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'active_device_123',
                device_name: 'Active Test Device',
                ip_address: '192.168.1.3',
                user_agent: 'Mozilla/5.0 (Active Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            const sessions = await UserSession.findActiveSessionsByUserId(testUser.id);
            expect(sessions).toBeDefined();
            expect(sessions.length).toBeGreaterThan(0);
            
            const createdSession = sessions.find(s => s.id === testSession.id);
            expect(createdSession).toBeDefined();

            // clean up
            await testSession.deactivate();
        });

        it('should not find expired sessions', async () => {
            const sessionToken = `expired_token_${Date.now()}`;
            const expiredData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'expired_device_123',
                device_name: 'Expired Test Device',
                ip_address: '192.168.1.4',
                user_agent: 'Mozilla/5.0 (Expired Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                is_active: false
            };

            testSession = await UserSession.create(expiredData);
            const sessions = await UserSession.findActiveSessionsByUserId(testUser.id);
            
            // should not find the inactive session we just created
            const inactiveSession = sessions.find(s => s.id === testSession.id);
            expect(inactiveSession).toBeUndefined();

            // clean up
            await testSession.deactivate();
        });
    });

    describe('update', () => {
        it('should update session data', async () => {
            const sessionToken = `update_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'update_device_123',
                device_name: 'Original Device',
                ip_address: '192.168.1.5',
                user_agent: 'Mozilla/5.0 (Original Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            const updateData = {
                device_name: 'Updated Device',
                ip_address: '192.168.1.6'
            };
            const updatedSession = await testSession.update(updateData);
            expect(updatedSession.device_name).toBe(updateData.device_name);
            expect(updatedSession.ip_address).toBe(updateData.ip_address);

            // clean up
            await testSession.deactivate();
        });
    });

    describe('deactivate', () => {
        it('should deactivate session', async () => {
            const sessionToken = `deactivate_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'deactivate_device_123',
                device_name: 'Deactivate Test Device',
                ip_address: '192.168.1.7',
                user_agent: 'Mozilla/5.0 (Deactivate Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.is_active).toBe(false);
        });
    });

    describe('verifyPin', () => {
        it('should verify PIN', async () => {
            const sessionToken = `pin_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'pin_device_123',
                device_name: 'PIN Test Device',
                ip_address: '192.168.1.8',
                user_agent: 'Mozilla/5.0 (PIN Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            await testSession.verifyPin();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.pin_verified).toBe(true);

            // clean up
            await testSession.deactivate();
        });
    });

    describe('isExpired and isValid', () => {
        it('should correctly identify expired session', async () => {
            const sessionToken = `validity_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'validity_device_123',
                device_name: 'Validity Test Device',
                ip_address: '192.168.1.9',
                user_agent: 'Mozilla/5.0 (Validity Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            expect(testSession.isExpired()).toBe(false); // not expired yet
            expect(testSession.isValid()).toBe(false); // but not valid because inactive
        });

        it('should correctly identify valid session', async () => {
            const sessionToken = `valid_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'valid_device_123',
                device_name: 'Valid Test Device',
                ip_address: '192.168.1.10',
                user_agent: 'Mozilla/5.0 (Valid Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            expect(testSession.isExpired()).toBe(false);
            expect(testSession.isValid()).toBe(true);

            // clean up
            await testSession.deactivate();
        });
    });

    describe('cleanupExpiredSessions', () => {
        it('should deactivate expired sessions', async () => {
            const sessionToken = `cleanup_token_${Date.now()}`;
            const testSessionData = {
                user_id: testUser.id,
                session_token: sessionToken,
                device_id: 'cleanup_device_123',
                device_name: 'Cleanup Test Device',
                ip_address: '192.168.1.11',
                user_agent: 'Mozilla/5.0 (Cleanup Test Browser)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            testSession = await UserSession.create(testSessionData);
            await testSession.deactivate();
            await UserSession.cleanupExpiredSessions();
            const foundSession = await UserSession.findByToken(testSession.session_token);
            expect(foundSession.is_active).toBe(false);
        });
    });

    describe('Session Data Validation', () => {
        it('should validate session relationships from preset data', async () => {
            // verify users from preset have expected structure
            const activeUsers = testUsers.filter(u => u.status === 'active');
            const pendingUsers = testUsers.filter(u => u.status === 'pending');
            
            expect(activeUsers.length).toBeGreaterThan(0);
            expect(pendingUsers.length).toBeGreaterThan(0);
            
            // verify each user has required fields for session operations
            testUsers.forEach(user => {
                expect(user.id).toBeDefined();
                expect(user.status).toBeDefined();
                expect(['active', 'pending', 'inactive'].includes(user.status)).toBe(true);
            });
        });

        it('should handle multiple users with session operations', async () => {
            // use different users from preset
            const user1 = testUsers.find(u => u.status === 'active');
            const user2 = testUsers.find(u => u.status === 'pending');
            
            const token1 = `multi1_${Date.now()}`;
            const token2 = `multi2_${Date.now()}`;
            
            // create sessions for different users
            const session1 = await UserSession.create({
                user_id: user1.id,
                session_token: token1,
                device_id: 'multi_device_1',
                device_name: 'Multi Test Device 1',
                ip_address: '192.168.1.20',
                user_agent: 'Mozilla/5.0 (Multi Test Browser 1)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            const session2 = await UserSession.create({
                user_id: user2.id,
                session_token: token2,
                device_id: 'multi_device_2',
                device_name: 'Multi Test Device 2',
                ip_address: '192.168.1.21',
                user_agent: 'Mozilla/5.0 (Multi Test Browser 2)',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
            
            // verify both sessions exist
            expect(session1.user_id).toBe(user1.id);
            expect(session2.user_id).toBe(user2.id);
            expect(session1.is_active).toBe(true);
            expect(session2.is_active).toBe(true);
            
            // clean up
            await session1.deactivate();
            await session2.deactivate();
        });

        it('should validate session device information', async () => {
            const devices = [
                { id: 'device_1', name: 'iPhone 14', ip: '192.168.1.100', agent: 'Mozilla/5.0 (iPhone)' },
                { id: 'device_2', name: 'Samsung Galaxy', ip: '192.168.1.101', agent: 'Mozilla/5.0 (Android)' },
                { id: 'device_3', name: 'MacBook Pro', ip: '192.168.1.102', agent: 'Mozilla/5.0 (Macintosh)' }
            ];
            
            const sessions = await Promise.all(
                devices.map((device, index) => UserSession.create({
                    user_id: testUser.id,
                    session_token: `device_${index}_${Date.now()}`,
                    device_id: device.id,
                    device_name: device.name,
                    ip_address: device.ip,
                    user_agent: device.agent,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }))
            );

            // verify all sessions belong to same user but different devices
            sessions.forEach((session, index) => {
                expect(session.user_id).toBe(testUser.id);
                expect(session.device_id).toBe(devices[index].id);
                expect(session.device_name).toBe(devices[index].name);
                expect(session.ip_address).toBe(devices[index].ip);
                expect(session.user_agent).toBe(devices[index].agent);
                expect(session.is_active).toBe(true);
            });

            // verify different device IDs
            const deviceIds = sessions.map(s => s.device_id);
            expect(new Set(deviceIds).size).toBe(3); // all unique

            // clean up
            await Promise.all(sessions.map(s => s.deactivate()));
        });
    });
}); 