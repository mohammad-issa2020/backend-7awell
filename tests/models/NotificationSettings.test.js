import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import NotificationSettings from '../../models/NotificationSettings.js';
import User from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';

describe('NotificationSettings Model', () => {
  let testUserId;
  let testUser;

  beforeEach(async () => {
    // Create a test user first
    testUserId = uuidv4();
    testUser = await User.create({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      username: `testuser_${Date.now()}`,
      first_name: 'Test',
      last_name: 'User'
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await NotificationSettings.destroy({ where: { user_id: testUserId } });
      await User.destroy({ where: { id: testUserId } });
    } catch (error) {
      console.log('Cleanup error (expected):', error.message);
    }
  });

  describe('Static Methods', () => {
    describe('create()', () => {
      it('should create notification settings with default values', async () => {
        const settingsData = {
          user_id: testUserId
        };

        const settings = await NotificationSettings.create(settingsData);

        expect(settings).toBeDefined();
        expect(settings.user_id).toBe(testUserId);
        expect(settings.push_enabled).toBe(true);
        expect(settings.transaction_alerts).toBe(true);
        expect(settings.security_alerts).toBe(true);
        expect(settings.promotions).toBe(true);
        expect(settings.email_notifications).toBe(true);
        expect(settings.sms_notifications).toBe(true);
        expect(settings.updated_at).toBeDefined();
      });

      it('should create notification settings with custom values', async () => {
        const settingsData = {
          user_id: testUserId,
          push_enabled: false,
          transaction_alerts: false,
          security_alerts: true,
          promotions: false,
          email_notifications: true,
          sms_notifications: false
        };

        const settings = await NotificationSettings.create(settingsData);

        expect(settings).toBeDefined();
        expect(settings.user_id).toBe(testUserId);
        expect(settings.push_enabled).toBe(false);
        expect(settings.transaction_alerts).toBe(false);
        expect(settings.security_alerts).toBe(true);
        expect(settings.promotions).toBe(false);
        expect(settings.email_notifications).toBe(true);
        expect(settings.sms_notifications).toBe(false);
      });

      it('should throw error for duplicate user_id', async () => {
        // Create first settings
        await NotificationSettings.create({ user_id: testUserId });

        // Try to create duplicate
        await expect(
          NotificationSettings.create({ user_id: testUserId })
        ).rejects.toThrow();
      });

      it('should throw error for invalid user_id', async () => {
        const invalidUserId = 'invalid-uuid';

        await expect(
          NotificationSettings.create({ user_id: invalidUserId })
        ).rejects.toThrow();
      });
    });

    describe('findByUserId()', () => {
      it('should find settings by user ID', async () => {
        // Create settings first
        const createdSettings = await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: false
        });

        const foundSettings = await NotificationSettings.findByUserId(testUserId);

        expect(foundSettings).toBeDefined();
        expect(foundSettings.user_id).toBe(testUserId);
        expect(foundSettings.push_enabled).toBe(false);
      });

      it('should return null for non-existent user ID', async () => {
        const nonExistentUserId = uuidv4();
        const settings = await NotificationSettings.findByUserId(nonExistentUserId);

        expect(settings).toBeNull();
      });
    });

    describe('findOne()', () => {
      it('should find settings with where conditions', async () => {
        await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: false,
          email_notifications: true
        });

        const settings = await NotificationSettings.findOne({
          where: { user_id: testUserId, push_enabled: false }
        });

        expect(settings).toBeDefined();
        expect(settings.user_id).toBe(testUserId);
        expect(settings.push_enabled).toBe(false);
      });

      it('should return null when no match found', async () => {
        const settings = await NotificationSettings.findOne({
          where: { user_id: uuidv4() }
        });

        expect(settings).toBeNull();
      });
    });

    describe('createDefault()', () => {
      it('should create default notification settings', async () => {
        const settings = await NotificationSettings.createDefault(testUserId);

        expect(settings).toBeDefined();
        expect(settings.user_id).toBe(testUserId);
        expect(settings.push_enabled).toBe(true);
        expect(settings.transaction_alerts).toBe(true);
        expect(settings.security_alerts).toBe(true);
        expect(settings.promotions).toBe(true);
        expect(settings.email_notifications).toBe(true);
        expect(settings.sms_notifications).toBe(true);
      });
    });

    describe('getUserWithNotificationSettings()', () => {
      it('should get user with notification settings', async () => {
        // Create notification settings
        await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: false
        });

        const userWithSettings = await NotificationSettings.getUserWithNotificationSettings(testUserId);

        expect(userWithSettings).toBeDefined();
        expect(userWithSettings.id).toBe(testUserId);
        expect(userWithSettings.notification_settings).toBeDefined();
        expect(userWithSettings.notification_settings.push_enabled).toBe(false);
      });

      it('should return user even without notification settings', async () => {
        const userWithSettings = await NotificationSettings.getUserWithNotificationSettings(testUserId);

        expect(userWithSettings).toBeDefined();
        expect(userWithSettings.id).toBe(testUserId);
        expect(userWithSettings.notification_settings).toBeNull();
      });
    });

    describe('Toggle Methods', () => {
      beforeEach(async () => {
        // Create default settings for toggle tests
        await NotificationSettings.createDefault(testUserId);
      });

      describe('togglePushNotifications()', () => {
        it('should toggle push notifications to false', async () => {
          const updatedSettings = await NotificationSettings.togglePushNotifications(testUserId, false);

          expect(updatedSettings.push_enabled).toBe(false);
        });

        it('should toggle push notifications to true', async () => {
          // First set to false
          await NotificationSettings.togglePushNotifications(testUserId, false);
          
          // Then toggle back to true
          const updatedSettings = await NotificationSettings.togglePushNotifications(testUserId, true);

          expect(updatedSettings.push_enabled).toBe(true);
        });

        it('should throw error for non-existent user', async () => {
          const nonExistentUserId = uuidv4();

          await expect(
            NotificationSettings.togglePushNotifications(nonExistentUserId, false)
          ).rejects.toThrow('Notification settings not found');
        });
      });

      describe('toggleEmailNotifications()', () => {
        it('should toggle email notifications', async () => {
          const updatedSettings = await NotificationSettings.toggleEmailNotifications(testUserId, false);

          expect(updatedSettings.email_notifications).toBe(false);
        });
      });

      describe('toggleSmsNotifications()', () => {
        it('should toggle SMS notifications', async () => {
          const updatedSettings = await NotificationSettings.toggleSmsNotifications(testUserId, false);

          expect(updatedSettings.sms_notifications).toBe(false);
        });
      });
    });

    describe('updatePreferences()', () => {
      beforeEach(async () => {
        await NotificationSettings.createDefault(testUserId);
      });

      it('should update multiple preferences at once', async () => {
        const preferences = {
          push_enabled: false,
          transaction_alerts: false,
          promotions: false
        };

        const updatedSettings = await NotificationSettings.updatePreferences(testUserId, preferences);

        expect(updatedSettings.push_enabled).toBe(false);
        expect(updatedSettings.transaction_alerts).toBe(false);
        expect(updatedSettings.promotions).toBe(false);
        expect(updatedSettings.security_alerts).toBe(true); // Should remain unchanged
        expect(updatedSettings.email_notifications).toBe(true); // Should remain unchanged
      });

      it('should throw error for non-existent user', async () => {
        const nonExistentUserId = uuidv4();

        await expect(
          NotificationSettings.updatePreferences(nonExistentUserId, { push_enabled: false })
        ).rejects.toThrow('Notification settings not found');
      });
    });
  });

  describe('Instance Methods', () => {
    let settingsInstance;

    beforeEach(async () => {
      const createdSettings = await NotificationSettings.create({
        user_id: testUserId,
        push_enabled: true,
        email_notifications: false
      });
      settingsInstance = new NotificationSettings(createdSettings);
    });

    describe('update()', () => {
      it('should update settings using instance method', async () => {
        const updateData = {
          push_enabled: false,
          transaction_alerts: false
        };

        const updatedSettings = await settingsInstance.update(updateData);

        expect(updatedSettings.push_enabled).toBe(false);
        expect(updatedSettings.transaction_alerts).toBe(false);
        expect(updatedSettings.email_notifications).toBe(false); // Should remain unchanged
        expect(updatedSettings.updated_at).toBeDefined();
      });

      it('should update the instance properties', async () => {
        await settingsInstance.update({ push_enabled: false });

        expect(settingsInstance.push_enabled).toBe(false);
      });
    });

    describe('destroy()', () => {
      it('should delete settings using instance method', async () => {
        const result = await settingsInstance.destroy();

        expect(result).toBe(true);

        // Verify settings are deleted
        const deletedSettings = await NotificationSettings.findByUserId(testUserId);
        expect(deletedSettings).toBeNull();
      });
    });
  });

  describe('Data Validation', () => {
    it('should handle boolean values correctly', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId,
        push_enabled: 'true', // String that should be converted
        transaction_alerts: 1, // Number that should be converted
        security_alerts: false,
        promotions: 0,
        email_notifications: null,
        sms_notifications: undefined
      });

      // Note: Supabase/PostgreSQL will handle type conversion
      expect(settings.user_id).toBe(testUserId);
      expect(typeof settings.push_enabled).toBe('boolean');
      expect(typeof settings.transaction_alerts).toBe('boolean');
      expect(typeof settings.security_alerts).toBe('boolean');
    });

    it('should have proper timestamp format', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId
      });

      expect(settings.updated_at).toBeDefined();
      expect(new Date(settings.updated_at)).toBeInstanceOf(Date);
      expect(new Date(settings.updated_at).getTime()).not.toBeNaN();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update data', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId
      });

      const instance = new NotificationSettings(settings);
      const updatedSettings = await instance.update({});

      expect(updatedSettings).toBeDefined();
      expect(updatedSettings.user_id).toBe(testUserId);
    });

    it('should handle partial updates', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId,
        push_enabled: true,
        email_notifications: true
      });

      const instance = new NotificationSettings(settings);
      const updatedSettings = await instance.update({
        push_enabled: false
        // Only updating one field
      });

      expect(updatedSettings.push_enabled).toBe(false);
      expect(updatedSettings.email_notifications).toBe(true); // Should remain unchanged
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that errors are properly thrown
      await expect(
        NotificationSettings.create({ user_id: 'invalid-uuid-format' })
      ).rejects.toThrow();
    });

    it('should handle foreign key constraint violations', async () => {
      const nonExistentUserId = uuidv4();

      await expect(
        NotificationSettings.create({ user_id: nonExistentUserId })
      ).rejects.toThrow();
    });
  });
}); 