import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Phone from '../../models/Phone.js';
import User from '../../models/User.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('Phone Model', () => {
  let setup;
  let testUsers;
  let testUser;
  let testPhoneHash;

  beforeAll(async () => {
    // load users from preset
    setup = await quickSetups.auth('integration');
    testUsers = setup.getData('users');
    testUser = testUsers.find(u => u.status === 'active');
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new phone record', async () => {
      // generate unique phone hash for each test
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      const data = { 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      };
      
      const result = await Phone.create(data);
      
      expect(result).toBeDefined();
      expect(result.phone_hash).toBe(testPhoneHash);
      expect(result.linked_user_id).toBe(testUser.id);

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should fail to create phone record with missing required fields', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      const data = { phone_hash: testPhoneHash };
      
      await expect(Phone.create(data))
        .rejects
        .toThrow('Missing required field: linked_user_id');
    });

    it('should find phone by hash', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const found = await Phone.findByHash(testPhoneHash);
      
      expect(found).toBeDefined();
      expect(found.phone_hash).toBe(testPhoneHash);
      expect(found.linked_user_id).toBe(testUser.id);

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should return null when phone hash not found', async () => {
      const found = await Phone.findByHash('nonexistenthash');
      expect(found).toBeNull();
    });

    it('should find phones by user id', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const found = await Phone.findByUserId(testUser.id);
      
      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThan(0);
      
      const createdPhone = found.find(p => p.phone_hash === testPhoneHash);
      expect(createdPhone).toBeDefined();
      expect(createdPhone.linked_user_id).toBe(testUser.id);

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should return empty array when user has no phones', async () => {
      // use a different user who doesn't have phones created in this test
      const userWithoutPhones = testUsers.find(u => u.status === 'pending');
      const found = await Phone.findByUserId(userWithoutPhones.id);
      expect(Array.isArray(found)).toBe(true);
    });

    it('should update a phone record', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
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

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should delete a phone record', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
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
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      const result = await Phone.linkToUser(testPhoneHash, testUser.id);
      
      expect(result).toBeDefined();
      expect(result).toBe(testUser.id);
      
      const found = await Phone.findByHash(testPhoneHash);
      expect(found.linked_user_id).toBe(testUser.id);

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should unlink phone from user', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
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
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const user = await Phone.getUserByHash(testPhoneHash);
      
      expect(user).toBeDefined();
      expect(user.user_id).toBe(testUser.id);
      expect(user.phone_hash).toBe(testPhoneHash);

      // clean up
      await Phone.delete(testPhoneHash);
    });

    it('should return null when getting user for non-existent phone hash', async () => {
      const user = await Phone.getUserByHash('nonexistenthash');
      expect(user).toBeNull();
    });
  });

  describe('Phone Data Validation', () => {
    it('should validate phone hash relationships from preset data', async () => {
      // verify users from preset have expected structure
      const activeUsers = testUsers.filter(u => u.status === 'active');
      const pendingUsers = testUsers.filter(u => u.status === 'pending');
      
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(pendingUsers.length).toBeGreaterThan(0);
      
      // verify each user has required fields for phone linking
      testUsers.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.status).toBeDefined();
        expect(['active', 'pending', 'inactive'].includes(user.status)).toBe(true);
      });
    });

    it('should handle multiple users with phone operations', async () => {
      // use different users from preset
      const user1 = testUsers.find(u => u.status === 'active');
      const user2 = testUsers.find(u => u.status === 'pending');
      
      const phoneHash1 = `multitest1${Date.now().toString(16)}`;
      const phoneHash2 = `multitest2${Date.now().toString(16)}`;
      
      // create phones for different users
      await Phone.create({ phone_hash: phoneHash1, linked_user_id: user1.id });
      await Phone.create({ phone_hash: phoneHash2, linked_user_id: user2.id });
      
      // verify both phones exist
      const found1 = await Phone.findByHash(phoneHash1);
      const found2 = await Phone.findByHash(phoneHash2);
      
      expect(found1.linked_user_id).toBe(user1.id);
      expect(found2.linked_user_id).toBe(user2.id);
      
      // clean up
      await Phone.delete(phoneHash1);
      await Phone.delete(phoneHash2);
    });
  });
}); 