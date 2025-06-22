import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('User with Settings Integration', () => {
  let setup;
  let testUsers;
  let testSettings;
  let testUser;
  let testUserSettings;

  beforeAll(async () => {
    // load user ecosystem from preset
    setup = await quickSetups.auth('integration');
    testUsers = setup.getData('users');
    testSettings = setup.getData('settings') || [];
    
    // find user with settings
    testUser = testUsers.find(u => u.status === 'active');
    testUserSettings = testSettings.find(s => s.user_id === testUser.id) || testSettings[0];
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
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

      // cleanup
      await UserSettings.destroy({ where: { user_id: testUser.id, id: settings.id } });
    });

    it('should create default settings', async () => {
      const settings = await UserSettings.createDefault(testUser.id);

      expect(settings).toBeDefined();
      expect(settings.user_id).toBe(testUser.id);
      expect(settings.language).toBe('en');
      expect(settings.theme).toBe('light');
      expect(settings.daily_limit).toBeNull();

      // cleanup
      await UserSettings.destroy({ where: { user_id: testUser.id, id: settings.id } });
    });

    it('should create settings with custom language', async () => {
      const settings = await UserSettings.createDefault(testUser.id, 'ar');

      expect(settings).toBeDefined();
      expect(settings.language).toBe('ar');
      expect(settings.theme).toBe('light');

      // cleanup
      await UserSettings.destroy({ where: { user_id: testUser.id, id: settings.id } });
    });

    it('should validate preset user-settings relationships', () => {
      // verify users from preset have expected structure
      expect(testUsers.length).toBeGreaterThan(0);
      expect(testUser).toBeDefined();
      
      // verify settings relationship
      if (testUserSettings) {
        expect(testUserSettings.user_id).toBe(testUser.id);
        expect(testUserSettings.language).toBeDefined();
        expect(testUserSettings.theme).toBeDefined();
      }
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
    it('should find settings by user ID from preset', async () => {
      if (testUserSettings) {
        const foundSettings = await UserSettings.findByUserId(testUser.id);
        
        expect(foundSettings).toBeDefined();
        expect(foundSettings.user_id).toBe(testUser.id);
        expect(foundSettings.language).toBeDefined();
        expect(foundSettings.theme).toBeDefined();
      }
    });

    it('should find settings using findOne with where clause', async () => {
      if (testUserSettings) {
        const foundSettings = await UserSettings.findOne({ 
          where: { user_id: testUser.id } 
        });
        
        expect(foundSettings).toBeDefined();
        expect(foundSettings.user_id).toBe(testUser.id);
        expect(foundSettings.theme).toBeDefined();
      }
    });

    it('should get user with settings data from preset', async () => {
      const userWithSettings = await UserSettings.getUserWithSettings(testUser.id);
      
      expect(userWithSettings).toBeDefined();
      expect(userWithSettings.id).toBe(testUser.id);
      expect(userWithSettings.email).toBe(testUser.email);
      
      if (testUserSettings) {
        expect(userWithSettings.user_settings).toBeDefined();
        
        if (Array.isArray(userWithSettings.user_settings)) {
          expect(userWithSettings.user_settings.length).toBeGreaterThan(0);
          expect(userWithSettings.user_settings[0].theme).toBeDefined();
        } else {
          expect(userWithSettings.user_settings.theme).toBeDefined();
        }
      }
    });

    it('should validate multiple user settings from preset', async () => {
      // test multiple users with settings
      for (const settings of testSettings.slice(0, 3)) {
        const userWithSettings = await UserSettings.getUserWithSettings(settings.user_id);
        
        if (userWithSettings) {
          expect(userWithSettings.id).toBe(settings.user_id);
          
          // verify user exists in preset
          const user = testUsers.find(u => u.id === settings.user_id);
          expect(user).toBeDefined();
        }
      }
    });

    it('should return null for non-existent settings', async () => {
      const nonExistentSettings = await UserSettings.findByUserId('00000000-0000-0000-0000-000000000000');
      expect(nonExistentSettings).toBeNull();
    });
  });

  describe('Settings Updates', () => {
    it('should update settings successfully', async () => {
      if (testUserSettings) {
        const originalLanguage = testUserSettings.language;
        const originalTheme = testUserSettings.theme;
        
        const settingsInstance = new UserSettings(testUserSettings);
        
        await settingsInstance.update({
          language: 'ar',
          theme: 'dark',
          daily_limit: 2000.00
        });

        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(updatedSettings.language).toBe('ar');
        expect(updatedSettings.theme).toBe('dark');
        expect(parseFloat(updatedSettings.daily_limit)).toBe(2000.00);

        // restore original settings
        await settingsInstance.update({
          language: originalLanguage,
          theme: originalTheme,
          daily_limit: testUserSettings.daily_limit
        });
      }
    });

    it('should update theme only', async () => {
      if (testUserSettings) {
        const originalTheme = testUserSettings.theme;
        
        await UserSettings.updateTheme(testUser.id, 'system');

        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(updatedSettings.theme).toBe('system');
        expect(updatedSettings.language).toBe(testUserSettings.language); // should remain unchanged

        // restore
        await UserSettings.updateTheme(testUser.id, originalTheme);
      }
    });

    it('should update language only', async () => {
      if (testUserSettings) {
        const originalLanguage = testUserSettings.language;
        
        await UserSettings.updateLanguage(testUser.id, 'fr');

        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(updatedSettings.language).toBe('fr');
        expect(updatedSettings.theme).toBe(testUserSettings.theme); // should remain unchanged

        // restore
        await UserSettings.updateLanguage(testUser.id, originalLanguage);
      }
    });

    it('should update daily limit only', async () => {
      if (testUserSettings) {
        const originalLimit = testUserSettings.daily_limit;
        
        await UserSettings.updateDailyLimit(testUser.id, 750.25);

        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(parseFloat(updatedSettings.daily_limit)).toBe(750.25);
        expect(updatedSettings.language).toBe(testUserSettings.language); // should remain unchanged

        // restore
        await UserSettings.updateDailyLimit(testUser.id, originalLimit);
      }
    });

    it('should set daily limit to null', async () => {
      if (testUserSettings) {
        const originalLimit = testUserSettings.daily_limit;
        
        await UserSettings.updateDailyLimit(testUser.id, null);

        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(updatedSettings.daily_limit).toBeNull();

        // restore
        await UserSettings.updateDailyLimit(testUser.id, originalLimit);
      }
    });
  });

  describe('Settings Data Validation', () => {
    it('should validate settings data structure from preset', () => {
      if (testSettings.length > 0) {
        testSettings.forEach((settings, index) => {
          expect(settings.user_id).toBeDefined();
          expect(typeof settings.user_id).toBe('string');
          
          // required fields
          expect(settings.language).toBeDefined();
          expect(typeof settings.language).toBe('string');
          expect(settings.theme).toBeDefined();
          expect(typeof settings.theme).toBe('string');
          
          // optional fields should be properly typed if present
          if (settings.daily_limit !== null && settings.daily_limit !== undefined) {
            expect(typeof settings.daily_limit).toBe('number');
            expect(settings.daily_limit).toBeGreaterThan(0);
          }
        });
      }
    });

    it('should validate settings language distribution', () => {
      if (testSettings.length > 0) {
        const languages = testSettings.map(s => s.language);
        const uniqueLanguages = [...new Set(languages)];
        
        // verify common languages exist
        const commonLanguages = ['en', 'ar', 'fr', 'es'];
        const hasCommonLanguage = uniqueLanguages.some(lang => 
          commonLanguages.includes(lang)
        );
        
        expect(hasCommonLanguage).toBe(true);
        
        // verify all languages are valid format
        uniqueLanguages.forEach(lang => {
          expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
        });
      }
    });

    it('should validate settings theme distribution', () => {
      if (testSettings.length > 0) {
        const themes = testSettings.map(s => s.theme);
        const uniqueThemes = [...new Set(themes)];
        
        // verify common themes exist
        const validThemes = ['light', 'dark', 'system', 'auto'];
        uniqueThemes.forEach(theme => {
          expect(validThemes.includes(theme)).toBe(true);
        });
        
        // should have variety
        expect(uniqueThemes.length).toBeGreaterThan(0);
      }
    });

    it('should validate settings daily limit distribution', () => {
      const settingsWithLimit = testSettings.filter(s => 
        s.daily_limit !== null && s.daily_limit !== undefined
      );
      
      if (settingsWithLimit.length > 0) {
        settingsWithLimit.forEach((settings, index) => {
          // daily limits should be reasonable
          expect(settings.daily_limit).toBeGreaterThan(0);
          expect(settings.daily_limit).toBeLessThan(1000000); // less than 1M
          
          // should be valid number format
          expect(typeof settings.daily_limit).toBe('number');
          expect(isFinite(settings.daily_limit)).toBe(true);
        });
      }
    });

    it('should validate user-settings data consistency', async () => {
      // verify each settings belongs to a valid user
      for (const settings of testSettings) {
        const user = testUsers.find(u => u.id === settings.user_id);
        expect(user).toBeDefined(`Settings user_id ${settings.user_id} should reference valid user`);
        
        if (user) {
          // active users should have settings
          if (user.status === 'active') {
            expect(settings.language).toBeDefined();
            expect(settings.theme).toBeDefined();
          }
        }
      }
    });

    it('should handle user preferences patterns', () => {
      if (testSettings.length > 0) {
        // analyze user preference patterns
        const languageThemePairs = testSettings.map(s => ({
          language: s.language,
          theme: s.theme
        }));
        
        // verify reasonable language-theme combinations
        languageThemePairs.forEach(pair => {
          expect(pair.language).toBeDefined();
          expect(pair.theme).toBeDefined();
          
          // Arabic users might prefer RTL-friendly themes
          if (pair.language === 'ar') {
            expect(['light', 'dark', 'system'].includes(pair.theme)).toBe(true);
          }
        });
      }
    });

    it('should validate settings update history patterns', async () => {
      if (testUserSettings) {
        // test multiple updates to see patterns
        const originalSettings = { ...testUserSettings };
        
        // update theme
        await UserSettings.updateTheme(testUser.id, 'dark');
        const afterThemeUpdate = await UserSettings.findByUserId(testUser.id);
        
        // update language
        await UserSettings.updateLanguage(testUser.id, 'fr');
        const afterLanguageUpdate = await UserSettings.findByUserId(testUser.id);
        
        // verify updates worked correctly
        expect(afterThemeUpdate.theme).toBe('dark');
        expect(afterLanguageUpdate.language).toBe('fr');
        
        // restore original settings
        await UserSettings.updateTheme(testUser.id, originalSettings.theme);
        await UserSettings.updateLanguage(testUser.id, originalSettings.language);
      }
    });
  });

  describe('Settings Deletion', () => {
    it('should delete settings successfully', async () => {
      // create temporary settings for deletion test
      const tempSettings = await UserSettings.create({
        user_id: testUser.id,
        language: 'en',
        theme: 'light'
      });

      const settingsInstance = new UserSettings(tempSettings);
      await settingsInstance.destroy();

      const deletedSettings = await UserSettings.findByUserId(testUser.id);
      
      // if there are other settings for this user, they should still exist
      // if this was the only settings, it should be null
      if (deletedSettings) {
        expect(deletedSettings.id).not.toBe(tempSettings.id);
      }
    });

    it('should cascade delete when user is deleted', async () => {
      // create temporary user and settings
      const tempUser = await User.create({
        phone: '+9876543210',
        email: 'temp@delete.com',
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      });

      const tempSettings = await UserSettings.create({
        user_id: tempUser.id,
        language: 'en',
        theme: 'light'
      });

      // delete user
      await User.destroy({ where: { id: tempUser.id } });

      // settings should be cascade deleted or orphaned
      const orphanedSettings = await UserSettings.findByUserId(tempUser.id);
      expect(orphanedSettings).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle settings with extreme daily limits', async () => {
      const extremeLimits = [0.01, 999999.99, 1.23456789];
      
      for (const limit of extremeLimits) {
        const settings = await UserSettings.create({
          user_id: testUser.id,
          language: 'en',
          theme: 'light',
          daily_limit: limit
        });
        
        expect(settings.daily_limit).toBe(limit.toString());
        
        // cleanup
        await UserSettings.destroy({ where: { id: settings.id } });
      }
    });

    it('should handle settings with special language codes', async () => {
      const specialLanguages = ['zh-CN', 'pt-BR', 'en-US', 'ar-SA'];
      
      for (const lang of specialLanguages) {
        const settings = await UserSettings.create({
          user_id: testUser.id,
          language: lang,
          theme: 'light'
        });
        
        expect(settings.language).toBe(lang);
        
        // cleanup
        await UserSettings.destroy({ where: { id: settings.id } });
      }
    });

    it('should handle concurrent settings updates', async () => {
      if (testUserSettings) {
        const originalTheme = testUserSettings.theme;
        const originalLanguage = testUserSettings.language;
        
        // simulate concurrent updates
        const themeUpdate = UserSettings.updateTheme(testUser.id, 'dark');
        const langUpdate = UserSettings.updateLanguage(testUser.id, 'fr');
        
        await Promise.all([themeUpdate, langUpdate]);
        
        const finalSettings = await UserSettings.findByUserId(testUser.id);
        expect(finalSettings.theme).toBe('dark');
        expect(finalSettings.language).toBe('fr');
        
        // restore
        await UserSettings.updateTheme(testUser.id, originalTheme);
        await UserSettings.updateLanguage(testUser.id, originalLanguage);
      }
    });

    it('should handle settings for users with different statuses', async () => {
      // test settings for different user statuses
      const userStatuses = ['active', 'pending', 'inactive'];
      
      for (const status of userStatuses) {
        const statusUser = testUsers.find(u => u.status === status);
        
        if (statusUser) {
          const settings = await UserSettings.createDefault(statusUser.id);
          expect(settings.user_id).toBe(statusUser.id);
          
          // cleanup
          await UserSettings.destroy({ where: { id: settings.id } });
        }
      }
    });

    it('should validate settings data integrity over time', async () => {
      if (testUserSettings) {
        // create snapshot of current settings
        const snapshot = await UserSettings.findByUserId(testUser.id);
        
        // perform various operations
        await UserSettings.updateTheme(testUser.id, 'dark');
        await UserSettings.updateLanguage(testUser.id, 'ar');
        await UserSettings.updateDailyLimit(testUser.id, 1500.00);
        
        // verify data integrity
        const updatedSettings = await UserSettings.findByUserId(testUser.id);
        expect(updatedSettings.user_id).toBe(testUser.id);
        expect(updatedSettings.theme).toBe('dark');
        expect(updatedSettings.language).toBe('ar');
        expect(parseFloat(updatedSettings.daily_limit)).toBe(1500.00);
        
        // restore original state
        await UserSettings.updateTheme(testUser.id, snapshot.theme);
        await UserSettings.updateLanguage(testUser.id, snapshot.language);
        await UserSettings.updateDailyLimit(testUser.id, snapshot.daily_limit);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid theme values', async () => {
      await expect(
        UserSettings.create({
          user_id: testUser.id,
          language: 'en',
          theme: 'invalid-theme'
        })
      ).rejects.toThrow();
    });

    it('should handle invalid language codes', async () => {
      await expect(
        UserSettings.create({
          user_id: testUser.id,
          language: 'invalid',
          theme: 'light'
        })
      ).rejects.toThrow();
    });

    it('should handle negative daily limits', async () => {
      await expect(
        UserSettings.create({
          user_id: testUser.id,
          language: 'en',
          theme: 'light',
          daily_limit: -100
        })
      ).rejects.toThrow();
    });

    it('should handle database connection errors gracefully', async () => {
      // this test would require mocking the database connection
      // for now, we'll test that errors are properly thrown
      await expect(
        UserSettings.create({ user_id: 'invalid-uuid-format' })
      ).rejects.toThrow();
    });
  });
}); 