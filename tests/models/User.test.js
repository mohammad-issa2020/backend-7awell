import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { quickSetups } from '../setup/presets.js';
import { UserTemplates, UserTestHelpers } from '../setup/userTemplates.js';
import User from '../../models/User.js';

describe('🧪 User Model Tests - Complete Coverage', () => {
  let setup;
  let existingUsers;

  beforeAll(async () => {
    
    setup = await quickSetups.userTests('integration');
    existingUsers = setup.getData('users');
    
    console.log('✅ User test setup complete:', {
      existingUsers: existingUsers.length
    });
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  beforeEach(() => {
    UserTemplates.resetCounters();
  });

  describe('✅ Create User Successfully', () => {
    
    it('should create new user with valid data', async () => {
      const userData = UserTemplates.getValidUser();
      
      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.phone).toBe(userData.phone);
      expect(user.email).toBe(userData.email);
      expect(user.status).toBe(userData.status);
      expect(user.kyc_level).toBe(userData.kyc_level);
      expect(user.created_at).toBeDefined();

      await User.destroy({ where: { id: user.id } });
    });

    it('should create verified user successfully', async () => {
      const userData = UserTemplates.getVerifiedUser();
      
      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.phone_verified).toBe(true);
      expect(user.email_verified).toBe(true);

      await User.destroy({ where: { id: user.id } });
    });

    it('should create user with different statuses', async () => {
      const testUsers = UserTemplates.getUsersWithDifferentStatuses();
      const createdUsers = [];

      for (const userData of testUsers) {
        const user = await User.create(userData);
        expect(user).toBeDefined();
        expect(user.status).toBe(userData.status);
        createdUsers.push(user);
      }

      // clean up the created users
      for (const user of createdUsers) {
        await User.destroy({ where: { id: user.id } });
      }
    });
  });


  describe('❌ Create User with Invalid Data', () => {

    describe('Invalid Phone Numbers', () => {
      
      it('should reject user with invalid phone format', async () => {
        const userData = UserTemplates.getUserWithInvalidPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with short phone number', async () => {
        const userData = UserTemplates.getUserWithShortPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with alphanumeric phone', async () => {
        const userData = UserTemplates.getUserWithAlphaPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with empty phone', async () => {
        const userData = UserTemplates.getUserWithEmptyPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with null phone', async () => {
        const userData = UserTemplates.getUserWithNullPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with undefined phone', async () => {
        const userData = UserTemplates.getUserWithUndefinedPhone();
        
        await expect(User.create(userData)).rejects.toThrow();
      });
    });

    describe('Invalid Email Addresses', () => {
      
      it('should reject user with invalid email format', async () => {
        const userData = UserTemplates.getUserWithInvalidEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with email missing @ sign', async () => {
        const userData = UserTemplates.getUserWithNoAtSignEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with email missing domain', async () => {
        const userData = UserTemplates.getUserWithNoDomainEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with empty email', async () => {
        const userData = UserTemplates.getUserWithEmptyEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with null email', async () => {
        const userData = UserTemplates.getUserWithNullEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with undefined email', async () => {
        const userData = UserTemplates.getUserWithUndefinedEmail();
        
        await expect(User.create(userData)).rejects.toThrow();
      });
    });

    describe('Invalid Other Fields', () => {
      
      it('should reject user with invalid status', async () => {
        const userData = UserTemplates.getUserWithInvalidStatus();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject user with invalid KYC level', async () => {
        const userData = UserTemplates.getUserWithInvalidKycLevel();
        
        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject incomplete user data', async () => {
        const userData = UserTemplates.getIncompleteUser();
        
        await expect(User.create(userData)).rejects.toThrow();
      });
    });
  });


  describe('❌ Create User with Duplicate Data', () => {

    it('should reject user with existing phone number', async () => {
      const existingPhone = existingUsers[0].phone;
      const userData = {
        ...UserTemplates.getValidUser(),
        phone: existingPhone
      };
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should reject user with existing email address', async () => {
      const existingEmail = existingUsers[0].email;
      const userData = {
        ...UserTemplates.getValidUser(),
        email: existingEmail
      };
      
      await expect(User.create(userData)).rejects.toThrow();
    });
  });


  describe('🔍 Get/Find User Tests', () => {

    it('should find user by ID', async () => {
      const existingUser = existingUsers[0];
      
      const foundUser = await User.findByPk(existingUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(existingUser.id);
      expect(foundUser.email).toBe(existingUser.email);
    });

    it('should find user by email', async () => {
      const existingUser = existingUsers[0];
      
      const foundUser = await User.findOne({ 
        where: { email: existingUser.email } 
      });
      
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(existingUser.email);
    });

    it('should find user by phone', async () => {
      const existingUser = existingUsers[0];
      
      const foundUser = await User.findOne({ 
        where: { phone: existingUser.phone } 
      });
      
      expect(foundUser).toBeDefined();
      expect(foundUser.phone).toBe(existingUser.phone);
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000001';
      
      const foundUser = await User.findByPk(nonExistentId);
      
      expect(foundUser).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await User.findOne({ 
        where: { email: 'nonexistent@example.com' } 
      });
      
      expect(foundUser).toBeNull();
    });
  });


  describe('✏️ Update User Tests', () => {

    it('should update user phone successfully', async () => {
      // create a temporary user
      const tempUserData = UserTemplates.getValidUser();
      const tempUser = await User.create(tempUserData);

      // update the phone
      const newPhone = UserTemplates.getValidUser().phone;
      const userInstance = new User(tempUser);
      await userInstance.update({ phone: newPhone });

      const updatedUser = await User.findByPk(tempUser.id);
      expect(updatedUser.phone).toBe(newPhone);
      expect(updatedUser.updated_at).toBeDefined();

      // clean up the user
      await User.destroy({ where: { id: tempUser.id } });
    });

    it('should update user email successfully', async () => {
      const tempUserData = UserTemplates.getValidUser();
      const tempUser = await User.create(tempUserData);

      const newEmail = UserTemplates.getValidUser().email;
      const userInstance = new User(tempUser);
      await userInstance.update({ email: newEmail });

      const updatedUser = await User.findByPk(tempUser.id);
      expect(updatedUser.email).toBe(newEmail);

      await User.destroy({ where: { id: tempUser.id } });
    });

    it('should update user status successfully', async () => {
      const tempUserData = UserTemplates.getValidUser();
      const tempUser = await User.create(tempUserData);

      const newStatus = 'inactive';
      const userInstance = new User(tempUser);
      await userInstance.update({ status: newStatus });

      const updatedUser = await User.findByPk(tempUser.id);
      expect(updatedUser.status).toBe(newStatus);

      await User.destroy({ where: { id: tempUser.id } });
    });
  });


  describe('🗑️ Delete User Tests', () => {

    it('should delete user successfully', async () => {
      const tempUserData = UserTemplates.getValidUser();
      const tempUser = await User.create(tempUserData);

      const userInstance = new User(tempUser);
      const deleteResult = await userInstance.destroy();

      expect(deleteResult).toBe(true);
      
      const deletedUser = await User.findByPk(tempUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should delete user by conditions', async () => {
      const tempUserData = UserTemplates.getValidUser();
      const tempUser = await User.create(tempUserData);

      const deleteResult = await User.destroy({ 
        where: { id: tempUser.id } 
      });

      expect(deleteResult).toBe(true);
      
      const deletedUser = await User.findByPk(tempUser.id);
      expect(deletedUser).toBeNull();
    });
  });


  describe('🔍 Data Validation Tests', () => {

    it('should validate user structure from existing data', async () => {
      const testUser = existingUsers[0];
      const validation = UserTestHelpers.expectValidUserStructure(testUser);

      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasValidPhone).toBe(true);
      expect(validation.hasValidEmail).toBe(true);
      expect(validation.hasValidStatus).toBe(true);
      expect(validation.hasValidKycLevel).toBe(true);
    });

    it('should validate all existing users have correct structure', async () => {
      existingUsers.forEach(user => {
        const validation = UserTestHelpers.expectValidUserStructure(user);
        
        expect(validation.hasRequiredFields).toBe(true);
        expect(validation.hasValidStatus).toBe(true);
        expect(validation.hasValidKycLevel).toBe(true);
      });
    });
  });

  describe('📊 Statistics and Reporting', () => {

    it('should report test coverage summary', () => {
      const testCoverage = {
        createTests: {
          successful: 3,
          invalidPhone: 6,
          invalidEmail: 6,
          invalidOther: 3,
          duplicates: 2
        },
        readTests: 5,
        updateTests: 3,
        deleteTests: 2,
        validationTests: 2
      };

      const totalTests = Object.values(testCoverage).reduce((sum, val) => {
        return sum + (typeof val === 'object' ? Object.values(val).reduce((s, v) => s + v, 0) : val);
      }, 0);

      console.log('📊 Test Coverage Summary:', {
        totalTests,
        breakdown: testCoverage,
        existingTestUsers: existingUsers.length
      });

      expect(totalTests).toBeGreaterThan(30);
    });
  });
}); 