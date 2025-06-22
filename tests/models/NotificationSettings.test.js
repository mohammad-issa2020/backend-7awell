import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import NotificationSettings from '../../models/NotificationSettings.js';
import User from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { quickSetups } from '../../tests/setup/presets.js';

describe('NotificationSettings Model', () => {
  let setup;
  let testUsers;
  let testUser;
  let testUserId;

  beforeAll(async () => {
    // load users from preset
    setup = await quickSetups.auth('integration');
    testUsers = setup.getData('users');
    testUser = testUsers.find(u => u.status === 'active');
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
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

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
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

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
      });

      it('should throw error for duplicate user_id', async () => {
        // create first settings
        await NotificationSettings.create({ user_id: testUserId });

        // try to create duplicate
        await expect(
          NotificationSettings.create({ user_id: testUserId })
        ).rejects.toThrow();

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
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
        // create settings first
        const createdSettings = await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: false
        });

        const foundSettings = await NotificationSettings.findByUserId(testUserId);

        expect(foundSettings).toBeDefined();
        expect(foundSettings.user_id).toBe(testUserId);
        expect(foundSettings.push_enabled).toBe(false);

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
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

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
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

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
      });
    });

    describe('getUserWithNotificationSettings()', () => {
      it('should get user with notification settings', async () => {
        // create notification settings
        await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: false
        });

        const userWithSettings = await NotificationSettings.getUserWithNotificationSettings(testUserId);

        expect(userWithSettings).toBeDefined();
        expect(userWithSettings.id).toBe(testUserId);
        expect(userWithSettings.notification_settings).toBeDefined();
        expect(userWithSettings.notification_settings.push_enabled).toBe(false);

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
      });

      it('should return user even without notification settings', async () => {
        const userWithSettings = await NotificationSettings.getUserWithNotificationSettings(testUserId);

        expect(userWithSettings).toBeDefined();
        expect(userWithSettings.id).toBe(testUserId);
        expect(userWithSettings.notification_settings).toBeNull();
      });
    });

    describe('Toggle Methods', () => {
      describe('togglePushNotifications()', () => {
        it('should toggle push notifications to false', async () => {
          // create default settings for toggle tests
          await NotificationSettings.createDefault(testUserId);

          const updatedSettings = await NotificationSettings.togglePushNotifications(testUserId, false);

          expect(updatedSettings.push_enabled).toBe(false);

          // clean up
          await NotificationSettings.destroy({ where: { user_id: testUserId } });
        });

        it('should toggle push notifications to true', async () => {
          // create default settings
          await NotificationSettings.createDefault(testUserId);
          
          // first set to false
          await NotificationSettings.togglePushNotifications(testUserId, false);
          
          // then toggle back to true
          const updatedSettings = await NotificationSettings.togglePushNotifications(testUserId, true);

          expect(updatedSettings.push_enabled).toBe(true);

          // clean up
          await NotificationSettings.destroy({ where: { user_id: testUserId } });
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
          await NotificationSettings.createDefault(testUserId);

          const updatedSettings = await NotificationSettings.toggleEmailNotifications(testUserId, false);

          expect(updatedSettings.email_notifications).toBe(false);

          // clean up
          await NotificationSettings.destroy({ where: { user_id: testUserId } });
        });
      });

      describe('toggleSmsNotifications()', () => {
        it('should toggle SMS notifications', async () => {
          await NotificationSettings.createDefault(testUserId);

          const updatedSettings = await NotificationSettings.toggleSmsNotifications(testUserId, false);

          expect(updatedSettings.sms_notifications).toBe(false);

          // clean up
          await NotificationSettings.destroy({ where: { user_id: testUserId } });
        });
      });
    });

    describe('updatePreferences()', () => {
      it('should update multiple preferences at once', async () => {
        await NotificationSettings.createDefault(testUserId);

        const preferences = {
          push_enabled: false,
          transaction_alerts: false,
          promotions: false
        };

        const updatedSettings = await NotificationSettings.updatePreferences(testUserId, preferences);

        expect(updatedSettings.push_enabled).toBe(false);
        expect(updatedSettings.transaction_alerts).toBe(false);
        expect(updatedSettings.promotions).toBe(false);
        expect(updatedSettings.security_alerts).toBe(true); // should remain unchanged
        expect(updatedSettings.email_notifications).toBe(true); // should remain unchanged

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
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

    describe('update()', () => {
      it('should update settings using instance method', async () => {
        const createdSettings = await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: true,
          email_notifications: false
        });
        settingsInstance = new NotificationSettings(createdSettings);

        const updateData = {
          push_enabled: false,
          transaction_alerts: false
        };

        const updatedSettings = await settingsInstance.update(updateData);

        expect(updatedSettings.push_enabled).toBe(false);
        expect(updatedSettings.transaction_alerts).toBe(false);
        expect(updatedSettings.email_notifications).toBe(false); // should remain unchanged
        expect(updatedSettings.updated_at).toBeDefined();

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
      });

      it('should update the instance properties', async () => {
        const createdSettings = await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: true
        });
        settingsInstance = new NotificationSettings(createdSettings);

        await settingsInstance.update({ push_enabled: false });

        expect(settingsInstance.push_enabled).toBe(false);

        // clean up
        await NotificationSettings.destroy({ where: { user_id: testUserId } });
      });
    });

    describe('destroy()', () => {
      it('should delete settings using instance method', async () => {
        const createdSettings = await NotificationSettings.create({
          user_id: testUserId,
          push_enabled: true
        });
        settingsInstance = new NotificationSettings(createdSettings);

        const result = await settingsInstance.destroy();

        expect(result).toBe(true);

        // verify settings are deleted
        const deletedSettings = await NotificationSettings.findByUserId(testUserId);
        expect(deletedSettings).toBeNull();
      });
    });
  });

  describe('Notification Settings Validation', () => {
    it('should validate notification settings relationships from preset data', async () => {
      // verify users from preset have expected structure
      const activeUsers = testUsers.filter(u => u.status === 'active');
      const pendingUsers = testUsers.filter(u => u.status === 'pending');
      
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(pendingUsers.length).toBeGreaterThan(0);
      
      // verify each user has required fields for notification settings
      testUsers.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.status).toBeDefined();
        expect(['active', 'pending', 'inactive'].includes(user.status)).toBe(true);
      });
    });

    it('should handle multiple users with notification settings', async () => {
      // use different users from preset
      const user1 = testUsers.find(u => u.status === 'active');
      const user2 = testUsers.find(u => u.status === 'pending');
      
      // create notification settings for different users
      const settings1 = await NotificationSettings.create({
        user_id: user1.id,
        push_enabled: true,
        email_notifications: false
      });

      const settings2 = await NotificationSettings.create({
        user_id: user2.id,
        push_enabled: false,
        email_notifications: true
      });
      
      // verify both settings exist with different preferences
      expect(settings1.user_id).toBe(user1.id);
      expect(settings2.user_id).toBe(user2.id);
      expect(settings1.push_enabled).toBe(true);
      expect(settings2.push_enabled).toBe(false);
      expect(settings1.email_notifications).toBe(false);
      expect(settings2.email_notifications).toBe(true);
      
      // clean up
      await NotificationSettings.destroy({ where: { user_id: user1.id } });
      await NotificationSettings.destroy({ where: { user_id: user2.id } });
    });

    it('should handle boolean values correctly', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId,
        push_enabled: 'true', // string that should be converted
        transaction_alerts: 1, // number that should be converted
        security_alerts: false,
        promotions: 0,
        email_notifications: null,
        sms_notifications: undefined
      });

      // note: Supabase/PostgreSQL will handle type conversion
      expect(settings.user_id).toBe(testUserId);
      expect(typeof settings.push_enabled).toBe('boolean');
      expect(typeof settings.transaction_alerts).toBe('boolean');
      expect(typeof settings.security_alerts).toBe('boolean');

      // clean up
      await NotificationSettings.destroy({ where: { user_id: testUserId } });
    });

    it('should have proper timestamp format', async () => {
      const settings = await NotificationSettings.create({
        user_id: testUserId
      });

      expect(settings.updated_at).toBeDefined();
      expect(new Date(settings.updated_at)).toBeInstanceOf(Date);
      expect(new Date(settings.updated_at).getTime()).not.toBeNaN();

      // clean up
      await NotificationSettings.destroy({ where: { user_id: testUserId } });
    });

    it('should validate notification preference combinations', async () => {
      const combinations = [
        { push: true, email: true, sms: true, alerts: true, promos: true },
        { push: false, email: true, sms: false, alerts: true, promos: false },
        { push: true, email: false, sms: true, alerts: false, promos: true }
      ];
      
      const settingsArray = [];
      
      // create settings with different combinations
      for (let i = 0; i < combinations.length && i < testUsers.length; i++) {
        const user = testUsers[i];
        const combo = combinations[i];
        
        const settings = await NotificationSettings.create({
          user_id: user.id,
          push_enabled: combo.push,
          email_notifications: combo.email,
          sms_notifications: combo.sms,
          transaction_alerts: combo.alerts,
          promotions: combo.promos
        });
        
        settingsArray.push({ settings, user, combo });
      }

      // verify all combinations work
      settingsArray.forEach(({ settings, combo }) => {
        expect(settings.push_enabled).toBe(combo.push);
        expect(settings.email_notifications).toBe(combo.email);
        expect(settings.sms_notifications).toBe(combo.sms);
        expect(settings.transaction_alerts).toBe(combo.alerts);
        expect(settings.promotions).toBe(combo.promos);
      });

      // clean up
      await Promise.all(settingsArray.map(({ user }) => 
        NotificationSettings.destroy({ where: { user_id: user.id } })
      ));
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

      // clean up
      await NotificationSettings.destroy({ where: { user_id: testUserId } });
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
        // only updating one field
      });

      expect(updatedSettings.push_enabled).toBe(false);
      expect(updatedSettings.email_notifications).toBe(true); // should remain unchanged

      // clean up
      await NotificationSettings.destroy({ where: { user_id: testUserId } });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // this test would require mocking the database connection
      // for now, we'll test that errors are properly thrown
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