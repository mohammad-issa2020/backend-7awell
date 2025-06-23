import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import ActivityLog from '../../models/ActivityLog.js';
import User from '../../models/User.js';
import { quickSetups } from '../../tests/setup/presets.js';
import { UserTemplates } from '../../tests/setup/userTemplates.js';

describe('ActivityLog Model', () => {
    let setup;
    let testUsers;
    let testUser;
    let testLog;

    beforeAll(async () => {
        // load users from preset
        setup = await quickSetups.auth('integration');
        testUsers = setup.getData('users');
        testUser = testUsers.find(u => u.status === 'active');
    });

    afterAll(async () => {
        // cleanup preset data
        if (setup) {
            await setup.cleanup();
        }
    });

    beforeEach(() => {
        UserTemplates.resetCounters();
    });

    describe('create', () => {
        it('should create a new activity log', async () => {
            const testLogData = {
                user_id: testUser.id,
                action: 'test_action',
                details: { test: 'data' },
                ip_address: '192.168.1.1',
                device_id: 'test_device_123'
            };

            testLog = await ActivityLog.create(testLogData);
            expect(testLog).toBeDefined();
            expect(testLog.user_id).toBe(testUser.id);
            expect(testLog.action).toBe(testLogData.action);
            expect(testLog.details).toEqual(testLogData.details);
            expect(testLog.ip_address).toBe(testLogData.ip_address);
            expect(testLog.device_id).toBe(testLogData.device_id);

            // clean up
            await ActivityLog.delete(testLog.id);
        });

        it('should throw error when creating log with null action', async () => {
            const invalidData = { 
                user_id: testUser.id, 
                action: null 
            };
            await expect(ActivityLog.create(invalidData)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should find log by id', async () => {
            const testLogData = {
                user_id: testUser.id,
                action: 'test_find_action',
                details: { test: 'find_data' },
                ip_address: '192.168.1.1',
                device_id: 'test_device_find'
            };

            testLog = await ActivityLog.create(testLogData);
            const foundLog = await ActivityLog.findById(testLog.id);
            expect(foundLog).toBeDefined();
            expect(foundLog.id).toBe(testLog.id);
            expect(foundLog.action).toBe(testLogData.action);

            // clean up
            await ActivityLog.delete(testLog.id);
        });

        it('should return null for non-existent id', async () => {
            const foundLog = await ActivityLog.findById('00000000-0000-0000-0000-000000000000');
            expect(foundLog).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should find logs by user id', async () => {
            const testLogData = {
                user_id: testUser.id,
                action: 'test_user_action',
                details: { test: 'user_data' },
                ip_address: '192.168.1.1',
                device_id: 'test_device_user'
            };

            testLog = await ActivityLog.create(testLogData);
            const logs = await ActivityLog.findByUserId(testUser.id);
            expect(logs).toBeDefined();
            expect(logs.length).toBeGreaterThan(0);
            
            const createdLog = logs.find(log => log.id === testLog.id);
            expect(createdLog).toBeDefined();

            // clean up
            await ActivityLog.delete(testLog.id);
        });

        it('should return empty array for non-existent user id', async () => {
            const logs = await ActivityLog.findByUserId('00000000-0000-0000-0000-000000000000');
            expect(logs).toBeDefined();
            expect(logs.length).toBe(0);
        });

        it('should respect pagination options', async () => {
            // create multiple logs for testing pagination
            const testLogs = await Promise.all([
                ActivityLog.create({
                    user_id: testUser.id,
                    action: 'page_test_1',
                    details: { page: 1 },
                    ip_address: '192.168.1.1',
                    device_id: 'page_device_1'
                }),
                ActivityLog.create({
                    user_id: testUser.id,
                    action: 'page_test_2',
                    details: { page: 2 },
                    ip_address: '192.168.1.1',
                    device_id: 'page_device_2'
                }),
                ActivityLog.create({
                    user_id: testUser.id,
                    action: 'page_test_3',
                    details: { page: 3 },
                    ip_address: '192.168.1.1',
                    device_id: 'page_device_3'
                })
            ]);

            // test pagination
            const paginatedLogs = await ActivityLog.findByUserId(testUser.id, { limit: 2, offset: 0 });
            expect(paginatedLogs.length).toBeGreaterThanOrEqual(2);

            const nextPageLogs = await ActivityLog.findByUserId(testUser.id, { limit: 2, offset: 2 });
            expect(nextPageLogs.length).toBeGreaterThanOrEqual(0);

            // clean up
            await Promise.all(testLogs.map(log => ActivityLog.delete(log.id)));
        });
    });

    describe('update', () => {
        it('should update log data', async () => {
            const testLogData = {
                user_id: testUser.id,
                action: 'original_action',
                details: { original: 'data' },
                ip_address: '192.168.1.1',
                device_id: 'original_device'
            };

            testLog = await ActivityLog.create(testLogData);
            const updateData = {
                action: 'updated_action',
                details: { updated: 'data' }
            };
            const updatedLog = await ActivityLog.update(testLog.id, updateData);
            expect(updatedLog.action).toBe(updateData.action);
            expect(updatedLog.details).toEqual(updateData.details);

            // clean up
            await ActivityLog.delete(testLog.id);
        });

        it('should throw error when updating non-existent log', async () => {
            await expect(ActivityLog.update('00000000-0000-0000-0000-000000000000', { action: 'test' }))
                .rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete log', async () => {
            const testLogData = {
                user_id: testUser.id,
                action: 'delete_test_action',
                details: { test: 'delete_data' },
                ip_address: '192.168.1.1',
                device_id: 'delete_device'
            };

            testLog = await ActivityLog.create(testLogData);
            const result = await ActivityLog.delete(testLog.id);
            expect(result).toBe(true);

            const foundLog = await ActivityLog.findById(testLog.id);
            expect(foundLog).toBeNull();
        });

        it('should return true when deleting non-existent log', async () => {
            const result = await ActivityLog.delete('00000000-0000-0000-0000-000000000000');
            expect(result).toBe(true);
        });
    });

    describe('formatDetails', () => {
        it('should format log details correctly', () => {
            const action = 'test_action';
            const additionalDetails = { key: 'value' };
            const details = ActivityLog.formatDetails(action, additionalDetails);

            expect(details).toHaveProperty('action', action);
            expect(details).toHaveProperty('timestamp');
            expect(details).toHaveProperty('key', 'value');
        });

        it('should handle empty additional details', () => {
            const action = 'test_action';
            const details = ActivityLog.formatDetails(action);

            expect(details).toHaveProperty('action', action);
            expect(details).toHaveProperty('timestamp');
            expect(Object.keys(details).length).toBe(2);
        });
    });
}); 