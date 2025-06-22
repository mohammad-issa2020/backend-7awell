import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UserTemplates, UserTestHelpers } from './userTemplates.js';



describe('🚀 Quick Demo - User Templates System', () => {
  
  beforeAll(() => {
    console.log('🎯 Starting User Templates Demo...');
  });

  afterAll(() => {
    console.log('✅ User Templates Demo Complete!');
  });

  describe('📋 Template Generation Tests', () => {
    
    it('should generate valid user data', () => {
      const validUser = UserTemplates.getValidUser();
      
      expect(validUser).toBeDefined();
      expect(validUser.phone).toMatch(/^\+1\d{10}$/);
      expect(validUser.email).toMatch(/.*@example\.com$/);
      expect(validUser.status).toBe('active');
      expect(validUser.kyc_level).toBe('none');
      
      console.log('✅ Valid user generated:', {
        phone: validUser.phone,
        email: validUser.email
      });
    });

    it('should generate unique users each time', () => {
      const user1 = UserTemplates.getValidUser();
      const user2 = UserTemplates.getValidUser();
      
      expect(user1.phone).not.toBe(user2.phone);
      expect(user1.email).not.toBe(user2.email);
      
      console.log('✅ Unique generation confirmed:', {
        user1: { phone: user1.phone, email: user1.email },
        user2: { phone: user2.phone, email: user2.email }
      });
    });

    it('should generate verified user correctly', () => {
      const verifiedUser = UserTemplates.getVerifiedUser();
      
      expect(verifiedUser.phone_verified).toBe(true);
      expect(verifiedUser.email_verified).toBe(true);
      expect(verifiedUser.verified).toBe(true);
      
      console.log('✅ Verified user generated correctly');
    });
  });

  describe('🔴 Invalid Data Templates', () => {
    
    it('should generate invalid phone templates', () => {
      const invalidPhone = UserTemplates.getUserWithInvalidPhone();
      const shortPhone = UserTemplates.getUserWithShortPhone();
      const alphaPhone = UserTemplates.getUserWithAlphaPhone();
      
      expect(invalidPhone.phone).toBe('invalid-phone');
      expect(shortPhone.phone).toBe('+123');
      expect(alphaPhone.phone).toBe('+1abc567890');
      
      console.log('✅ Invalid phone templates:', {
        invalid: invalidPhone.phone,
        short: shortPhone.phone,
        alpha: alphaPhone.phone
      });
    });

    it('should generate invalid email templates', () => {
      const invalidEmail = UserTemplates.getUserWithInvalidEmail();
      const noAtSign = UserTemplates.getUserWithNoAtSignEmail();
      const noDomain = UserTemplates.getUserWithNoDomainEmail();
      
      expect(invalidEmail.email).toBe('invalid-email');
      expect(noAtSign.email).toBe('invalidemail.com');
      expect(noDomain.email).toBe('invalid@');
      
      console.log('✅ Invalid email templates:', {
        invalid: invalidEmail.email,
        noAt: noAtSign.email,
        noDomain: noDomain.email
      });
    });
  });

  describe('🛠️ Helper Functions', () => {
    
    it('should generate multiple valid users', () => {
      const users = UserTemplates.getMultipleValidUsers(3);
      
      expect(users).toHaveLength(3);
      expect(users[0].phone).not.toBe(users[1].phone);
      expect(users[1].email).not.toBe(users[2].email);
      
      console.log('✅ Multiple users generated:', users.length);
    });

    it('should get users with different statuses', () => {
      const statusUsers = UserTemplates.getUsersWithDifferentStatuses();
      
      expect(statusUsers).toHaveLength(3);
      expect(statusUsers[0].status).toBe('active');
      expect(statusUsers[1].status).toBe('pending');
      expect(statusUsers[2].status).toBe('inactive');
      
      console.log('✅ Different status users:', statusUsers.map(u => u.status));
    });

    it('should reset counters correctly', () => {
      const user1 = UserTemplates.getValidUser();
      UserTemplates.resetCounters();
      const user2 = UserTemplates.getValidUser();
      
      // After reset, should generate similar pattern but different timestamp
      expect(user1.phone).toMatch(/^\+1100000000\d$/);
      expect(user2.phone).toMatch(/^\+1100000000\d$/);
      
      console.log('✅ Counter reset working');
    });
  });

  describe('🔍 Validation Helpers', () => {
    
    it('should validate user structure correctly', () => {
      const validUser = UserTemplates.getValidUser();
      const validation = UserTestHelpers.expectValidUserStructure(validUser);
      
      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasValidPhone).toBe(true);
      expect(validation.hasValidEmail).toBe(true);
      expect(validation.hasValidStatus).toBe(true);
      expect(validation.hasValidKycLevel).toBe(true);
      
      console.log('✅ User validation working:', validation);
    });

    it('should detect invalid user structure', () => {
      const invalidUser = UserTemplates.getUserWithInvalidPhone();
      const validation = UserTestHelpers.expectValidUserStructure(invalidUser);
      
      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasValidPhone).toBe(false); // Should be false
      expect(validation.hasValidEmail).toBe(true);
      
      console.log('✅ Invalid detection working:', validation);
    });
  });

  describe('📊 Complete System Test', () => {
    
    it('should generate comprehensive test data set', () => {
      const allTestUsers = UserTemplates.getAllTestUsers();
      
      expect(allTestUsers.valid).toHaveLength(3);
      expect(allTestUsers.invalidPhone).toHaveLength(6);
      expect(allTestUsers.invalidEmail).toHaveLength(6);
      expect(allTestUsers.invalidOther).toHaveLength(3);
      expect(allTestUsers.duplicates).toHaveLength(2);
      
      const totalUsers = Object.values(allTestUsers).reduce((sum, arr) => sum + arr.length, 0);
      
      console.log('📊 Complete test data generated:', {
        categories: Object.keys(allTestUsers),
        totalUsers,
        breakdown: Object.fromEntries(
          Object.entries(allTestUsers).map(([key, arr]) => [key, arr.length])
        )
      });
      
      expect(totalUsers).toBe(20); // 3+6+6+3+2 = 20
    });
  });
}); 