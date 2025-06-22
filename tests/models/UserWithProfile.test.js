import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import UserWithProfile from '../../models/UserWithProfile.js';
import User from '../../models/User.js';
import UserProfile from '../../models/UserProfile.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('UserWithProfile Model', () => {
  let setup;
  let testUsers;
  let testProfiles;
  let testUser;
  let testProfile;

  beforeAll(async () => {
    // load user ecosystem from preset
    setup = await quickSetups.auth('integration');
    testUsers = setup.getData('users');
    testProfiles = setup.getData('profiles') || [];
    
    // find user with profile
    testUser = testUsers.find(u => u.status === 'active');
    testProfile = testProfiles.find(p => p.user_id === testUser.id) || testProfiles[0];
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
  });

  describe('User Profile Relationship', () => {
    it('should create user with profile successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser123',
        first_name: 'New',
        last_name: 'User'
      };

      const profileData = {
        bio: 'This is a test bio',
        phone_number: '+1234567890',
        date_of_birth: new Date('1990-01-01'),
        avatar_url: 'https://example.com/avatar.jpg',
        location: 'Test City'
      };

      const userWithProfile = new UserWithProfile();
      const result = await userWithProfile.createUserWithProfile(userData, profileData);

      expect(result.user).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.profile.bio).toBe(profileData.bio);
      expect(result.profile.user_id).toBe(result.user.id);

      // cleanup
      await UserProfile.destroy({ where: { user_id: result.user.id } });
      await User.destroy({ where: { id: result.user.id } });
    });

    it('should validate preset user-profile relationships', () => {
      // verify users from preset have expected structure
      expect(testUsers.length).toBeGreaterThan(0);
      expect(testUser).toBeDefined();
      
      // verify profile relationship
      if (testProfile) {
        expect(testProfile.user_id).toBe(testUser.id);
        expect(testProfile.bio).toBeDefined();
      }
    });

    it('should get user with profile from preset data', async () => {
      if (testProfile) {
        const userWithProfile = new UserWithProfile();
        const result = await userWithProfile.getUserWithProfile(testUser.id);

        expect(result).toBeDefined();
        expect(result.id).toBe(testUser.id);
        expect(result.profile).toBeDefined();
        expect(result.profile.user_id).toBe(testUser.id);
      }
    });
  });

  describe('Profile Management', () => {
    it('should update user profile', async () => {
      if (testProfile) {
        const userWithProfile = new UserWithProfile();
        const updateData = {
          bio: 'Updated bio from test',
          location: 'Updated Location'
        };

        const updatedProfile = await userWithProfile.updateProfile(testUser.id, updateData);

        expect(updatedProfile).toBeDefined();
        expect(updatedProfile.bio).toBe('Updated bio from test');
        expect(updatedProfile.location).toBe('Updated Location');
        expect(updatedProfile.user_id).toBe(testUser.id);

        // restore original data
        await userWithProfile.updateProfile(testUser.id, {
          bio: testProfile.bio,
          location: testProfile.location
        });
      }
    });

    it('should create profile for user without one', async () => {
      // find user without profile
      const userWithoutProfile = testUsers.find(u => 
        !testProfiles.some(p => p.user_id === u.id)
      );

      if (userWithoutProfile) {
        const userWithProfile = new UserWithProfile();
        const profileData = {
          bio: 'New profile bio',
          phone_number: '+9876543210',
          location: 'New Location'
        };

        const createdProfile = await userWithProfile.createProfile(userWithoutProfile.id, profileData);

        expect(createdProfile).toBeDefined();
        expect(createdProfile.user_id).toBe(userWithoutProfile.id);
        expect(createdProfile.bio).toBe('New profile bio');

        // cleanup
        await UserProfile.destroy({ where: { user_id: userWithoutProfile.id } });
      }
    });

    it('should validate multiple user profiles from preset', async () => {
      const userWithProfile = new UserWithProfile();
      
      // test multiple users with profiles
      for (const profile of testProfiles.slice(0, 3)) {
        const result = await userWithProfile.getUserWithProfile(profile.user_id);
        
        if (result) {
          expect(result.id).toBe(profile.user_id);
          expect(result.profile).toBeDefined();
          expect(result.profile.user_id).toBe(profile.user_id);
          
          // verify user exists in preset
          const user = testUsers.find(u => u.id === profile.user_id);
          expect(user).toBeDefined();
        }
      }
    });
  });

  describe('Profile Data Validation', () => {
    it('should validate profile data structure from preset', () => {
      if (testProfiles.length > 0) {
        testProfiles.forEach((profile, index) => {
          expect(profile.user_id).toBeDefined();
          expect(typeof profile.user_id).toBe('string');
          
          // optional fields should be properly typed if present
          if (profile.bio) {
            expect(typeof profile.bio).toBe('string');
            expect(profile.bio.length).toBeGreaterThan(0);
          }
          
          if (profile.phone_number) {
            expect(typeof profile.phone_number).toBe('string');
            expect(profile.phone_number).toMatch(/^\+?[\d\s\-\(\)]+$/);
          }
          
          if (profile.date_of_birth) {
            expect(new Date(profile.date_of_birth)).toBeInstanceOf(Date);
          }
          
          if (profile.avatar_url) {
            expect(typeof profile.avatar_url).toBe('string');
            expect(profile.avatar_url).toMatch(/^https?:\/\//);
          }
        });
      }
    });

    it('should validate profile completeness distribution', () => {
      if (testProfiles.length > 0) {
        const completeProfiles = testProfiles.filter(p => 
          p.bio && p.phone_number && p.location
        );
        
        const partialProfiles = testProfiles.filter(p => 
          !p.bio || !p.phone_number || !p.location
        );
        
        // should have variety in profile completeness
        expect(testProfiles.length).toBeGreaterThan(0);
        
        // at least some profiles should have basic info
        const profilesWithBasicInfo = testProfiles.filter(p => p.bio || p.location);
        expect(profilesWithBasicInfo.length).toBeGreaterThan(0);
      }
    });

    it('should validate profile age distribution', () => {
      const profilesWithAge = testProfiles.filter(p => p.date_of_birth);
      
      if (profilesWithAge.length > 0) {
        profilesWithAge.forEach(profile => {
          const birthDate = new Date(profile.date_of_birth);
          const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          // reasonable age range
          expect(age).toBeGreaterThan(0);
          expect(age).toBeLessThan(120);
          
          // not in the future
          expect(birthDate.getTime()).toBeLessThan(Date.now());
        });
      }
    });

    it('should validate profile bio quality', () => {
      const profilesWithBio = testProfiles.filter(p => p.bio && p.bio.trim().length > 0);
      
      if (profilesWithBio.length > 0) {
        profilesWithBio.forEach((profile, index) => {
          // bio should be reasonable length
          expect(profile.bio.length).toBeGreaterThan(5, 
            `Profile ${index} bio too short`);
          expect(profile.bio.length).toBeLessThan(500, 
            `Profile ${index} bio too long`);
          
          // should not contain placeholder text
          expect(profile.bio.toLowerCase()).not.toContain('lorem');
          expect(profile.bio.toLowerCase()).not.toContain('placeholder');
        });
      }
    });

    it('should validate profile phone numbers', () => {
      const profilesWithPhone = testProfiles.filter(p => p.phone_number);
      
      if (profilesWithPhone.length > 0) {
        profilesWithPhone.forEach((profile, index) => {
          // phone should be reasonable format
          expect(profile.phone_number).toMatch(/^\+?[\d\s\-\(\)]+$/, 
            `Profile ${index} phone number invalid format`);
          
          // should be reasonable length
          const cleanPhone = profile.phone_number.replace(/[\s\-\(\)]/g, '');
          expect(cleanPhone.length).toBeGreaterThanOrEqual(10, 
            `Profile ${index} phone number too short`);
          expect(cleanPhone.length).toBeLessThanOrEqual(15, 
            `Profile ${index} phone number too long`);
        });
      }
    });

    it('should validate profile avatar URLs', () => {
      const profilesWithAvatar = testProfiles.filter(p => p.avatar_url);
      
      if (profilesWithAvatar.length > 0) {
        profilesWithAvatar.forEach((profile, index) => {
          // avatar URL should be valid
          expect(profile.avatar_url).toMatch(/^https?:\/\//, 
            `Profile ${index} avatar URL should start with http/https`);
          
          // should be reasonable length
          expect(profile.avatar_url.length).toBeGreaterThan(10, 
            `Profile ${index} avatar URL too short`);
          expect(profile.avatar_url.length).toBeLessThan(500, 
            `Profile ${index} avatar URL too long`);
          
          // should contain common image domains or file extensions
          const hasImageIndicator = 
            profile.avatar_url.includes('imgur') ||
            profile.avatar_url.includes('cloudinary') ||
            profile.avatar_url.includes('amazonaws') ||
            profile.avatar_url.includes('.jpg') ||
            profile.avatar_url.includes('.png') ||
            profile.avatar_url.includes('.gif') ||
            profile.avatar_url.includes('.jpeg');
          
          expect(hasImageIndicator).toBe(true, 
            `Profile ${index} avatar URL should indicate image content`);
        });
      }
    });
  });

  describe('User-Profile Integration', () => {
    it('should validate user-profile data consistency', async () => {
      // verify each profile belongs to a valid user
      for (const profile of testProfiles) {
        const user = testUsers.find(u => u.id === profile.user_id);
        expect(user).toBeDefined(`Profile user_id ${profile.user_id} should reference valid user`);
        
        if (user) {
          // user should be active if they have a complete profile
          if (profile.bio && profile.location && profile.phone_number) {
            expect(user.status).toBe('active');
          }
        }
      }
    });

    it('should handle user profile search functionality', async () => {
      const userWithProfile = new UserWithProfile();
      
      // search by partial name
      const searchResults = await userWithProfile.searchUsersWithProfiles('test');
      
      if (searchResults && searchResults.length > 0) {
        searchResults.forEach(result => {
          expect(result.id).toBeDefined();
          expect(result.email || result.username || result.first_name || result.last_name).toBeDefined();
          
          if (result.profile) {
            expect(result.profile.user_id).toBe(result.id);
          }
        });
      }
    });

    it('should validate profile privacy settings', async () => {
      const profilesWithPrivacy = testProfiles.filter(p => p.privacy_settings);
      
      if (profilesWithPrivacy.length > 0) {
        profilesWithPrivacy.forEach(profile => {
          expect(typeof profile.privacy_settings).toBe('object');
          
          // common privacy settings
          if (profile.privacy_settings.public_profile !== undefined) {
            expect(typeof profile.privacy_settings.public_profile).toBe('boolean');
          }
          
          if (profile.privacy_settings.show_email !== undefined) {
            expect(typeof profile.privacy_settings.show_email).toBe('boolean');
          }
          
          if (profile.privacy_settings.show_phone !== undefined) {
            expect(typeof profile.privacy_settings.show_phone).toBe('boolean');
          }
        });
      }
    });

    it('should handle user profile statistics', async () => {
      const userWithProfile = new UserWithProfile();
      const stats = await userWithProfile.getProfileStatistics();
      
      if (stats) {
        expect(stats.total_profiles).toBeDefined();
        expect(stats.complete_profiles).toBeDefined();
        expect(stats.profiles_with_avatar).toBeDefined();
        
        // stats should be reasonable
        expect(stats.total_profiles).toBeGreaterThanOrEqual(0);
        expect(stats.complete_profiles).toBeLessThanOrEqual(stats.total_profiles);
        expect(stats.profiles_with_avatar).toBeLessThanOrEqual(stats.total_profiles);
      }
    });

    it('should validate profile update history', async () => {
      if (testProfile) {
        const userWithProfile = new UserWithProfile();
        
        // update profile to create history
        await userWithProfile.updateProfile(testUser.id, {
          bio: 'Updated for history test'
        });
        
        const history = await userWithProfile.getProfileUpdateHistory(testUser.id);
        
        if (history && history.length > 0) {
          history.forEach(update => {
            expect(update.user_id).toBe(testUser.id);
            expect(update.updated_at).toBeDefined();
            expect(new Date(update.updated_at)).toBeInstanceOf(Date);
          });
        }
        
        // restore original bio
        await userWithProfile.updateProfile(testUser.id, {
          bio: testProfile.bio
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle users without profiles gracefully', async () => {
      const userWithoutProfile = testUsers.find(u => 
        !testProfiles.some(p => p.user_id === u.id)
      );
      
      if (userWithoutProfile) {
        const userWithProfile = new UserWithProfile();
        const result = await userWithProfile.getUserWithProfile(userWithoutProfile.id);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(userWithoutProfile.id);
        expect(result.profile).toBeNull();
      }
    });

    it('should handle profile data with special characters', async () => {
      const specialBio = 'Bio with émojis 🌟 and spéciál çhars & symbols!';
      const specialLocation = 'Città di San Marino, São Paulo';
      
      const userData = {
        email: 'special@example.com',
        username: 'specialuser',
        first_name: 'José',
        last_name: 'García'
      };

      const profileData = {
        bio: specialBio,
        location: specialLocation,
        phone_number: '+55 11 9999-8888'
      };

      const userWithProfile = new UserWithProfile();
      const result = await userWithProfile.createUserWithProfile(userData, profileData);

      expect(result.profile.bio).toBe(specialBio);
      expect(result.profile.location).toBe(specialLocation);

      // cleanup
      await UserProfile.destroy({ where: { user_id: result.user.id } });
      await User.destroy({ where: { id: result.user.id } });
    });

    it('should handle long profile data', async () => {
      const longBio = 'A'.repeat(450); // Close to max length
      const longLocation = 'B'.repeat(90); // Close to max length
      
      const userData = {
        email: 'longdata@example.com',
        username: 'longdatauser',
        first_name: 'Long',
        last_name: 'Data'
      };

      const profileData = {
        bio: longBio,
        location: longLocation
      };

      const userWithProfile = new UserWithProfile();
      const result = await userWithProfile.createUserWithProfile(userData, profileData);

      expect(result.profile.bio).toBe(longBio);
      expect(result.profile.location).toBe(longLocation);

      // cleanup
      await UserProfile.destroy({ where: { user_id: result.user.id } });
      await User.destroy({ where: { id: result.user.id } });
    });

    it('should handle profile updates with partial data', async () => {
      if (testProfile) {
        const userWithProfile = new UserWithProfile();
        const originalBio = testProfile.bio;
        
        // update only one field
        const partialUpdate = { bio: 'Only bio updated' };
        const updatedProfile = await userWithProfile.updateProfile(testUser.id, partialUpdate);
        
        expect(updatedProfile.bio).toBe('Only bio updated');
        expect(updatedProfile.location).toBe(testProfile.location); // should remain unchanged
        
        // restore
        await userWithProfile.updateProfile(testUser.id, { bio: originalBio });
      }
    });

    it('should handle concurrent profile updates', async () => {
      if (testProfile) {
        const userWithProfile = new UserWithProfile();
        
        // simulate concurrent updates
        const update1 = userWithProfile.updateProfile(testUser.id, { bio: 'Update 1' });
        const update2 = userWithProfile.updateProfile(testUser.id, { location: 'Update 2' });
        
        const results = await Promise.all([update1, update2]);
        
        // both updates should succeed
        expect(results[0]).toBeDefined();
        expect(results[1]).toBeDefined();
        
        // restore original data
        await userWithProfile.updateProfile(testUser.id, {
          bio: testProfile.bio,
          location: testProfile.location
        });
      }
    });
  });
}); 