import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';

describe('User with Settings Integration', () => {
  let testUser;
  let testSettings;

  beforeEach(async () => {
    // Clear tables before each test
    await UserSettings.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Create a test user
    testUser = await User.create({
      phone: '+1234567890',
      email: 'john.doe@example.com',
      phone_verified: false,
      email_verified: false,
      status: 'active',
      kyc_level: 'none'
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await UserSettings.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('Settings Creation', () => {
    it('should create user settings successfully', async () => {
      const settingsData = {
        user_id: testUser.id,
        language: 'en',
        theme: 'dark',
        daily_limit: 1000.50
      };

      const settings = await UserSettings.create(settingsData);

      expect(settings).toBeDefined();
      expect(settings.user_id).toBe(testUser.id);
      expect(settings.language).toBe('en');
      expect(settings.theme).toBe('dark');
      expect(settings.daily_limit).toBe('1000.50');
    });

    it('should create default settings', async () => {
      const settings = await UserSettings.createDefault(testUser.id);

      expect(settings).toBeDefined();
      expect(settings.user_id).toBe(testUser.id);
      expect(settings.language).toBe('en');
      expect(settings.theme).toBe('light');
      expect(settings.daily_limit).toBeNull();
    });

    it('should create settings with custom language', async () => {
      const settings = await UserSettings.createDefault(testUser.id, 'ar');

      expect(settings).toBeDefined();
      expect(settings.language).toBe('ar');
      expect(settings.theme).toBe('light');
    });

    it('should not create settings for non-existent user', async () => {
      const settingsData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        language: 'en',
        theme: 'light'
      };

      await expect(UserSettings.create(settingsData)).rejects.toThrow();
    });
  });

  describe('Settings Retrieval', () => {
    beforeEach(async () => {
      testSettings = await UserSettings.create({
        user_id: testUser.id,
        language: 'en',
        theme: 'dark',
        daily_limit: 500.00
      });
    });

    it('should find settings by user ID', async () => {
      const foundSettings = await UserSettings.findByUserId(testUser.id);
      
      expect(foundSettings).toBeDefined();
      expect(foundSettings.user_id).toBe(testUser.id);
      expect(foundSettings.language).toBe('en');
      expect(foundSettings.theme).toBe('dark');
      expect(parseFloat(foundSettings.daily_limit)).toBe(500.00);
    });

    it('should find settings using findOne with where clause', async () => {
      const foundSettings = await UserSettings.findOne({ 
        where: { user_id: testUser.id } 
      });
      
      expect(foundSettings).toBeDefined();
      expect(foundSettings.user_id).toBe(testUser.id);
      expect(foundSettings.theme).toBe('dark');
    });

    it('should get user with settings data', async () => {
      const userWithSettings = await UserSettings.getUserWithSettings(testUser.id);
      
      expect(userWithSettings).toBeDefined();
      expect(userWithSettings.id).toBe(testUser.id);
      expect(userWithSettings.email).toBe(testUser.email);
      expect(userWithSettings.user_settings).toBeDefined();
      
      if (Array.isArray(userWithSettings.user_settings)) {
        expect(userWithSettings.user_settings.length).toBeGreaterThan(0);
        expect(userWithSettings.user_settings[0].theme).toBe('dark');
      } else {
        expect(userWithSettings.user_settings.theme).toBe('dark');
      }
    });

    it('should return null for non-existent settings', async () => {
      const nonExistentSettings = await UserSettings.findByUserId('00000000-0000-0000-0000-000000000000');
      expect(nonExistentSettings).toBeNull();
    });
  });

  describe('Settings Updates', () => {
    beforeEach(async () => {
      testSettings = await UserSettings.create({
        user_id: testUser.id,
        language: 'en',
        theme: 'light',
        daily_limit: 100.00
      });
    });

    it('should update settings successfully', async () => {
      const settingsInstance = new UserSettings(testSettings);
      
      await settingsInstance.update({
        language: 'ar',
        theme: 'dark',
        daily_limit: 2000.00
      });

      const updatedSettings = await UserSettings.findByUserId(testUser.id);
      expect(updatedSettings.language).toBe('ar');
      expect(updatedSettings.theme).toBe('dark');
      expect(parseFloat(updatedSettings.daily_limit)).toBe(2000.00);
    });

    it('should update theme only', async () => {
      await UserSettings.updateTheme(testUser.id, 'system');

      const updatedSettings = await UserSettings.findByUserId(testUser.id);
      expect(updatedSettings.theme).toBe('system');
      expect(updatedSettings.language).toBe('en'); // Should remain unchanged
    });

    it('should update language only', async () => {
      await UserSettings.updateLanguage(testUser.id, 'fr');

      const updatedSettings = await UserSettings.findByUserId(testUser.id);
      expect(updatedSettings.language).toBe('fr');
      expect(updatedSettings.theme).toBe('light'); // Should remain unchanged
    });

    it('should update daily limit only', async () => {
      await UserSettings.updateDailyLimit(testUser.id, 750.25);

      const updatedSettings = await UserSettings.findByUserId(testUser.id);
      expect(parseFloat(updatedSettings.daily_limit)).toBe(750.25);
      expect(updatedSettings.language).toBe('en'); // Should remain unchanged
    });

    it('should set daily limit to null', async () => {
      await UserSettings.updateDailyLimit(testUser.id, null);

      const updatedSettings = await UserSettings.findByUserId(testUser.id);
      expect(updatedSettings.daily_limit).toBeNull();
    });
  });

  describe('Settings Deletion', () => {
    beforeEach(async () => {
      testSettings = await UserSettings.create({
        user_id: testUser.id,
        language: 'en',
        theme: 'light'
      });
    });

    it('should delete settings successfully', async () => {
      const settingsInstance = new UserSettings(testSettings);
      await settingsInstance.destroy();

      const deletedSettings = await UserSettings.findByUserId(testUser.id);
      expect(deletedSettings).toBeNull();
    });

    it('should keep user data when settings are deleted', async () => {
      const settingsInstance = new UserSettings(testSettings);
      await settingsInstance.destroy();

      const userStillExists = await User.findByPk(testUser.id);
      expect(userStillExists).toBeDefined();
      expect(userStillExists.email).toBe(testUser.email);
    });
  });

  describe('Theme Validation', () => {
    it('should accept valid theme values', async () => {
      const themes = ['light', 'dark', 'system'];
      
      for (const theme of themes) {
        const settings = await UserSettings.create({
          user_id: testUser.id,
          language: 'en',
          theme: theme
        });
        
        expect(settings.theme).toBe(theme);
        
        // Clean up for next iteration
        const settingsInstance = new UserSettings(settings);
        await settingsInstance.destroy();
      }
    });
  });

  describe('Language Validation', () => {
    it('should accept valid language codes', async () => {
      const languages = ['en', 'ar', 'fr', 'es', 'de'];
      
      for (const language of languages) {
        const settings = await UserSettings.create({
          user_id: testUser.id,
          language: language,
          theme: 'light'
        });
        
        expect(settings.language).toBe(language);
        
        // Clean up for next iteration
        const settingsInstance = new UserSettings(settings);
        await settingsInstance.destroy();
      }
    });
  });

  describe('Daily Limit Validation', () => {
    it('should accept positive daily limits', async () => {
      const limits = [0, 100.50, 1000, 9999.99];
      
      for (const limit of limits) {
        const settings = await UserSettings.create({
          user_id: testUser.id,
          language: 'en',
          theme: 'light',
          daily_limit: limit
        });
        
        expect(parseFloat(settings.daily_limit)).toBe(limit);
        
        // Clean up for next iteration
        const settingsInstance = new UserSettings(settings);
        await settingsInstance.destroy();
      }
    });

    it('should accept null daily limit', async () => {
      const settings = await UserSettings.create({
        user_id: testUser.id,
        language: 'en',
        theme: 'light',
        daily_limit: null
      });
      
      expect(settings.daily_limit).toBeNull();
    });
  });

  describe('Complete User Lifecycle with Settings', () => {
    it('should create user, add settings, update both, and delete', async () => {
      // 1. Create user (already done in beforeEach)
      expect(testUser).toBeDefined();
      expect(testUser.email).toBe('john.doe@example.com');

      // 2. Add settings
      const settings = await UserSettings.createDefault(testUser.id, 'ar');
      expect(settings.language).toBe('ar');
      expect(settings.theme).toBe('light');

      // 3. Update user
      const userInstance = new User(testUser);
      await userInstance.update({ 
        phone_verified: true,
        kyc_level: 'basic'
      });

      // 4. Update settings
      await UserSettings.updateTheme(testUser.id, 'dark');
      await UserSettings.updateDailyLimit(testUser.id, 1500.00);

      // 5. Verify updates
      const updatedUser = await User.findByPk(testUser.id);
      const updatedSettings = await UserSettings.findByUserId(testUser.id);

      expect(updatedUser.phone_verified).toBe(true);
      expect(updatedUser.kyc_level).toBe('basic');
      expect(updatedSettings.theme).toBe('dark');
      expect(updatedSettings.language).toBe('ar'); // Should remain unchanged
      expect(parseFloat(updatedSettings.daily_limit)).toBe(1500.00);

      // 6. Get complete user data
      const completeUser = await UserSettings.getUserWithSettings(testUser.id);
      expect(completeUser).toBeDefined();
      expect(completeUser.phone_verified).toBe(true);
      
      // 7. Clean up (will be done in afterEach)
    });
  });
}); 