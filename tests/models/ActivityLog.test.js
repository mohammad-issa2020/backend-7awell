import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import ActivityLog from '../../models/ActivityLog.js';
import User from '../../models/User.js';

describe('ActivityLog Model', () => {
    let testUser;
    let testLog;
    const testLogData = {
        user_id: null, // Will be set after user creation
        action: 'test_action',
        details: { test: 'data' },
        ip_address: '192.168.1.1',
        device_id: 'test_device_123'
    };

    beforeEach(async () => {
        // Create a test user
        const randomNum = Math.floor(Math.random() * 10000);
        testUser = await User.create({
            email: `test_${randomNum}@example.com`,
            phone: `+1234567890${randomNum}`,
            password: 'Test123!@#'
        });

        // Set the user_id in test log data
        testLogData.user_id = testUser.id;
    });

    afterEach(async () => {
        // Clean up test data
        if (testLog) {
            await ActivityLog.delete(testLog.id);
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
        it('should create a new activity log', async () => {
            testLog = await ActivityLog.create(testLogData);
            expect(testLog).toBeDefined();
            expect(testLog.user_id).toBe(testUser.id);
            expect(testLog.action).toBe(testLogData.action);
            expect(testLog.details).toEqual(testLogData.details);
            expect(testLog.ip_address).toBe(testLogData.ip_address);
            expect(testLog.device_id).toBe(testLogData.device_id);
        });

       

        it('should throw error when creating log with null action', async () => {
            const invalidData = { ...testLogData, action: null };
            await expect(ActivityLog.create(invalidData)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should find log by id', async () => {
            testLog = await ActivityLog.create(testLogData);
            const foundLog = await ActivityLog.findById(testLog.id);
            expect(foundLog).toBeDefined();
            expect(foundLog.id).toBe(testLog.id);
            expect(foundLog.action).toBe(testLogData.action);
        });

        it('should return null for non-existent id', async () => {
            const foundLog = await ActivityLog.findById('00000000-0000-0000-0000-000000000000');
            expect(foundLog).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should find logs by user id', async () => {
            testLog = await ActivityLog.create(testLogData);
            const logs = await ActivityLog.findByUserId(testUser.id);
            expect(logs).toBeDefined();
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].id).toBe(testLog.id);
        });

        it('should return empty array for non-existent user id', async () => {
            const logs = await ActivityLog.findByUserId('00000000-0000-0000-0000-000000000000');
            expect(logs).toBeDefined();
            expect(logs.length).toBe(0);
        });

        it('should respect pagination options', async () => {
            // Create multiple logs
            const logs = await Promise.all([
                ActivityLog.create(testLogData),
                ActivityLog.create(testLogData),
                ActivityLog.create(testLogData)
            ]);

            // Test pagination
            const paginatedLogs = await ActivityLog.findByUserId(testUser.id, { limit: 2, offset: 0 });
            expect(paginatedLogs.length).toBe(2);

            const nextPageLogs = await ActivityLog.findByUserId(testUser.id, { limit: 2, offset: 2 });
            expect(nextPageLogs.length).toBe(1);
        });
    });

    describe('update', () => {
        it('should update log data', async () => {
            testLog = await ActivityLog.create(testLogData);
            const updateData = {
                action: 'updated_action',
                details: { updated: 'data' }
            };
            const updatedLog = await ActivityLog.update(testLog.id, updateData);
            expect(updatedLog.action).toBe(updateData.action);
            expect(updatedLog.details).toEqual(updateData.details);
        });

        it('should throw error when updating non-existent log', async () => {
            await expect(ActivityLog.update('00000000-0000-0000-0000-000000000000', { action: 'test' }))
                .rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete log', async () => {
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