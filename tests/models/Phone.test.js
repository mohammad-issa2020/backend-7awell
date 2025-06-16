import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phone from '../../models/Phone.js';
import User from '../../models/User.js';

describe('Phone Model', () => {
  let testUser;
  let testPhoneHash;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      phone: `+121111${Date.now().toString().slice(-4)}`,
      email: `test${Date.now()}@example.com`,
      status: 'active',
      kyc_level: 'basic',
      phone_verified: true,
      email_verified: true
    });

    // Generate unique phone hash for each test
    testPhoneHash = `testphonehash${Date.now().toString(16)}`;
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await Phone.delete(testPhoneHash);
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
    if (testUser) {
      try {
        await testUser.destroy();
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    }
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new phone record', async () => {
      const data = { 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      };
      
      const result = await Phone.create(data);
      
      expect(result).toBeDefined();
      expect(result.phone_hash).toBe(testPhoneHash);
      expect(result.linked_user_id).toBe(testUser.id);
    });

    it('should fail to create phone record with missing required fields', async () => {
      const data = { phone_hash: testPhoneHash };
      
      await expect(Phone.create(data))
        .rejects
        .toThrow('Missing required field: linked_user_id');
    });

    it('should find phone by hash', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const found = await Phone.findByHash(testPhoneHash);
      
      expect(found).toBeDefined();
      expect(found.phone_hash).toBe(testPhoneHash);
      expect(found.linked_user_id).toBe(testUser.id);
    });

    it('should return null when phone hash not found', async () => {
      const found = await Phone.findByHash('nonexistenthash');
      expect(found).toBeNull();
    });

    it('should find phones by user id', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const found = await Phone.findByUserId(testUser.id);
      
      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].phone_hash).toBe(testPhoneHash);
      expect(found[0].linked_user_id).toBe(testUser.id);
    });

    it('should return empty array when user has no phones', async () => {
      const found = await Phone.findByUserId(testUser.id);
      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBe(0);
    });

    it('should update a phone record', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const updated = await Phone.update(testPhoneHash, { 
        linked_user_id: testUser.id 
      });
      
      expect(updated).toBeDefined();
      expect(updated.phone_hash).toBe(testPhoneHash);
      expect(updated.linked_user_id).toBe(testUser.id);
    });

    it('should delete a phone record', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const deleted = await Phone.delete(testPhoneHash);
      expect(deleted).toBe(true);
      
      const found = await Phone.findByHash(testPhoneHash);
      expect(found).toBeNull();
    });
  });

  describe('User Linking Operations', () => {
    it('should link phone to user', async () => {
      const result = await Phone.linkToUser(testPhoneHash, testUser.id);
      
      expect(result).toBeDefined();
      expect(result).toBe(testUser.id);
      
      const found = await Phone.findByHash(testPhoneHash);
      expect(found.linked_user_id).toBe(testUser.id);
    });

    it('should unlink phone from user', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const result = await Phone.unlinkFromUser(testPhoneHash);
      expect(result).toBe(true);
      
      const found = await Phone.findByHash(testPhoneHash);
      expect(found).toBeNull();
    });

    it('should get user by phone hash', async () => {
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const user = await Phone.getUserByHash(testPhoneHash);
      
      expect(user).toBeDefined();
      expect(user.user_id).toBe(testUser.id);
      expect(user.phone_hash).toBe(testPhoneHash);
    });

    it('should return null when getting user for non-existent phone hash', async () => {
      const user = await Phone.getUserByHash('nonexistenthash');
      expect(user).toBeNull();
    });
  });
}); 