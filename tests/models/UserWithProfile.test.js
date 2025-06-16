import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import User from '../../models/User.js';
import UserProfile from '../../models/UserProfile.js';

describe('User with Profile Integration', () => {
  let testUser;
  let testProfile;

  beforeEach(async () => {
    // Clear tables before each test
    await UserProfile.destroy({ where: {} });
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
    await UserProfile.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('Profile Creation', () => {
    it('should create a user profile successfully', async () => {
      const profileData = {
        user_id: testUser.id,
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        date_of_birth: '1990-01-01',
        gender: 'male',
        country: 'US',
        address: '123 Main St, City, State'
      };

      const profile = await UserProfile.create(profileData);

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(testUser.id);
      expect(profile.first_name).toBe('John');
      expect(profile.last_name).toBe('Doe');
      expect(profile.gender).toBe('male');
      expect(profile.country).toBe('US');
    });

    it('should create a minimal profile with required fields only', async () => {
      const profileData = {
        user_id: testUser.id,
        first_name: 'Jane',
        last_name: 'Smith'
      };

      const profile = await UserProfile.create(profileData);

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(testUser.id);
      expect(profile.first_name).toBe('Jane');
      expect(profile.last_name).toBe('Smith');
      expect(profile.avatar_url).toBeNull();
      expect(profile.date_of_birth).toBeNull();
      expect(profile.gender).toBeNull();
      expect(profile.country).toBeNull();
      expect(profile.address).toBeNull();
    });

    it('should not create profile for non-existent user', async () => {
      const profileData = {
        user_id: '00000000-0000-0000-0000-000000000000', // Non-existent user
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(UserProfile.create(profileData)).rejects.toThrow();
    });
  });

  describe('Profile Retrieval', () => {
    beforeEach(async () => {
      // Create a test profile
      testProfile = await UserProfile.create({
        user_id: testUser.id,
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        gender: 'male',
        country: 'US'
      });
    });

    it('should find profile by user ID', async () => {
      const foundProfile = await UserProfile.findByUserId(testUser.id);
      
      expect(foundProfile).toBeDefined();
      expect(foundProfile.user_id).toBe(testUser.id);
      expect(foundProfile.first_name).toBe('John');
      expect(foundProfile.last_name).toBe('Doe');
    });

    it('should find profile using findOne with where clause', async () => {
      const foundProfile = await UserProfile.findOne({ 
        where: { user_id: testUser.id } 
      });
      
      expect(foundProfile).toBeDefined();
      expect(foundProfile.user_id).toBe(testUser.id);
      expect(foundProfile.first_name).toBe('John');
    });

    it('should get user with profile data', async () => {
      const userWithProfile = await UserProfile.getUserWithProfile(testUser.id);
      
      expect(userWithProfile).toBeDefined();
      expect(userWithProfile.id).toBe(testUser.id);
      expect(userWithProfile.email).toBe(testUser.email);
      expect(userWithProfile.user_profiles).toBeDefined();
      
      if (Array.isArray(userWithProfile.user_profiles)) {
        expect(userWithProfile.user_profiles.length).toBeGreaterThan(0);
        expect(userWithProfile.user_profiles[0].first_name).toBe('John');
      } else {
        expect(userWithProfile.user_profiles.first_name).toBe('John');
      }
    });

    it('should return null for non-existent profile', async () => {
      const nonExistentProfile = await UserProfile.findByUserId('00000000-0000-0000-0000-000000000000');
      expect(nonExistentProfile).toBeNull();
    });
  });

  describe('Profile Updates', () => {
    beforeEach(async () => {
      testProfile = await UserProfile.create({
        user_id: testUser.id,
        first_name: 'John',
        last_name: 'Doe',
        gender: 'male',
        country: 'US'
      });
    });

    it('should update profile successfully', async () => {
      const profileInstance = new UserProfile(testProfile);
      
      await profileInstance.update({
        first_name: 'Johnny',
        last_name: 'Smith',
        avatar_url: 'https://example.com/new-avatar.jpg'
      });

      const updatedProfile = await UserProfile.findByUserId(testUser.id);
      expect(updatedProfile.first_name).toBe('Johnny');
      expect(updatedProfile.last_name).toBe('Smith');
      expect(updatedProfile.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should update only specified fields', async () => {
      const profileInstance = new UserProfile(testProfile);
      
      await profileInstance.update({
        avatar_url: 'https://example.com/updated-avatar.jpg'
      });

      const updatedProfile = await UserProfile.findByUserId(testUser.id);
      expect(updatedProfile.first_name).toBe('John'); // Should remain unchanged
      expect(updatedProfile.last_name).toBe('Doe'); // Should remain unchanged
      expect(updatedProfile.avatar_url).toBe('https://example.com/updated-avatar.jpg');
    });
  });

  describe('Profile Deletion', () => {
    beforeEach(async () => {
      testProfile = await UserProfile.create({
        user_id: testUser.id,
        first_name: 'John',
        last_name: 'Doe'
      });
    });

    it('should delete profile successfully', async () => {
      const profileInstance = new UserProfile(testProfile);
      await profileInstance.destroy();

      const deletedProfile = await UserProfile.findByUserId(testUser.id);
      expect(deletedProfile).toBeNull();
    });

    it('should keep user data when profile is deleted', async () => {
      const profileInstance = new UserProfile(testProfile);
      await profileInstance.destroy();

      const userStillExists = await User.findByPk(testUser.id);
      expect(userStillExists).toBeDefined();
      expect(userStillExists.email).toBe(testUser.email);
    });
  });

  describe('Complete User Lifecycle', () => {
    it('should create user, add profile, update both, and delete', async () => {
      // 1. Create user (already done in beforeEach)
      expect(testUser).toBeDefined();
      expect(testUser.email).toBe('john.doe@example.com');

      // 2. Add profile
      const profile = await UserProfile.create({
        user_id: testUser.id,
        first_name: 'John',
        last_name: 'Doe',
        gender: 'male',
        country: 'US'
      });
      expect(profile.first_name).toBe('John');

      // 3. Update user
      const userInstance = new User(testUser);
      await userInstance.update({ 
        phone_verified: true,
        kyc_level: 'basic'
      });

      // 4. Update profile
      const profileInstance = new UserProfile(profile);
      await profileInstance.update({
        avatar_url: 'https://example.com/avatar.jpg',
        address: '123 Updated St'
      });

      // 5. Verify updates
      const updatedUser = await User.findByPk(testUser.id);
      const updatedProfile = await UserProfile.findByUserId(testUser.id);

      expect(updatedUser.phone_verified).toBe(true);
      expect(updatedUser.kyc_level).toBe('basic');
      expect(updatedProfile.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(updatedProfile.address).toBe('123 Updated St');

      // 6. Get complete user data
      const completeUser = await UserProfile.getUserWithProfile(testUser.id);
      expect(completeUser).toBeDefined();
      expect(completeUser.phone_verified).toBe(true);
      
      // 7. Clean up (will be done in afterEach)
    });
  });
}); 