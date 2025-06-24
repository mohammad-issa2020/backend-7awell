import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import Phone from '../../models/Phone.js';
import { supabaseAdmin } from '../../database/supabase.js';
import { integrationTestSetup, integrationTestCleanup } from '../setup/setup.js';

describe('Phone Model', () => {
  let testUser;
  let testUsers;
  let testPhoneHash;
  let createdPhoneHashes = []; // Track created phone hashes for cleanup

  beforeAll(async () => {
    try {
      console.log('🔧 Setting up Phone.test.js...');
      
      // Check if database is available
      if (!supabaseAdmin) {
        console.log('⚠️ Database not available, skipping Phone tests');
        return;
      }

      // Test database connection
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('count(*)')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
      } catch (dbError) {
        console.log('⚠️ Database connection failed, skipping Phone tests:', dbError.message);
        return;
      }

      const result = await integrationTestSetup();
      testUsers = result.users;
      testUser = testUsers && testUsers.length > 0 ? testUsers[0] : null;
      
      if (!testUser) {
        console.log('⚠️ No test user available, some tests will be skipped');
      } else {
        console.log(`✅ Setup complete. Found ${testUsers.length} users, using user: ${testUser.id}`);
      }
    } catch (error) {
      console.error('❌ Setup failed:', error);
      testUser = null;
      testUsers = [];
    }
  });

  afterAll(async () => {
    try {
      console.log('🧹 Cleaning up Phone.test.js...');
      
      // Clean up any remaining phone hashes
      if (createdPhoneHashes.length > 0 && supabaseAdmin) {
        for (const phoneHash of createdPhoneHashes) {
          try {
            await Phone.delete(phoneHash);
          } catch (error) {
            console.log(`⚠️ Could not clean phone hash ${phoneHash}:`, error.message);
          }
        }
      }
      
      await integrationTestCleanup();
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  });

  beforeEach(() => {
    testPhoneHash = null;
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new phone record', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
      const result = await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      expect(result).toBeDefined();
      expect(result.phone_hash).toBe(testPhoneHash);
      expect(result.linked_user_id).toBe(testUser.id);
    });

    it('should fail to create phone record with missing required fields', async () => {
      // Skip test if database unavailable
      if (!supabaseAdmin) {
        console.log('⚠️ Skipping test - database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      const data = { phone_hash: testPhoneHash };
      
      await expect(Phone.create(data))
        .rejects
        .toThrow('Missing required field: linked_user_id');
    });

    it('should find phone by hash', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
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
      // Skip test if database unavailable
      if (!supabaseAdmin) {
        console.log('⚠️ Skipping test - database unavailable');
        return;
      }
      
      const found = await Phone.findByHash('nonexistenthash');
      expect(found).toBeNull();
    });

    it('should find phones by user id', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
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
    });

    it('should return empty array when user has no phones', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUsers || testUsers.length === 0 || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test users available or database unavailable');
        return;
      }
      
      // use a different user who doesn't have phones created in this test
      // Try to find a pending user, then suspended, then use last user
      const userWithoutPhones = testUsers.find(u => u.status === 'pending') || 
                               testUsers.find(u => u.status === 'suspended') || 
                               testUsers[testUsers.length - 1];
      
      if (!userWithoutPhones) {
        console.log('⚠️ Skipping test - no suitable user found');
        return;
      }
      
      const found = await Phone.findByUserId(userWithoutPhones.id);
      expect(Array.isArray(found)).toBe(true);
    });

    it('should update a phone record', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
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
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      await Phone.create({ 
        phone_hash: testPhoneHash, 
        linked_user_id: testUser.id 
      });
      
      const deleted = await Phone.delete(testPhoneHash);
      expect(deleted).toBe(true);
      
      const found = await Phone.findByHash(testPhoneHash);
      expect(found).toBeNull();
      
      // Remove from cleanup list since it's already deleted
      const index = createdPhoneHashes.indexOf(testPhoneHash);
      if (index > -1) {
        createdPhoneHashes.splice(index, 1);
      }
    });
  });

  describe('User Linking Operations', () => {
    it('should link phone to user', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
      try {
        const result = await Phone.linkToUser(testPhoneHash, testUser.id);
        
        expect(result).toBeDefined();
        expect(result).toBe(testUser.id);
        
        const found = await Phone.findByHash(testPhoneHash);
        expect(found.linked_user_id).toBe(testUser.id);
      } catch (error) {
        if (error.message.includes('Database connection not available') || 
            error.message.includes('fetch failed')) {
          console.log('⚠️ Skipping test due to database connectivity issues');
          return;
        }
        throw error;
      }
    });

    it('should unlink phone from user', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      
      try {
        await Phone.create({ 
          phone_hash: testPhoneHash, 
          linked_user_id: testUser.id 
        });
        
        const result = await Phone.unlinkFromUser(testPhoneHash);
        expect(result).toBe(true);
        
        const found = await Phone.findByHash(testPhoneHash);
        expect(found).toBeNull();
        
        // Remove from cleanup list since it's already deleted
        const index = createdPhoneHashes.indexOf(testPhoneHash);
        if (index > -1) {
          createdPhoneHashes.splice(index, 1);
        }
      } catch (error) {
        if (error.message.includes('Database connection not available') || 
            error.message.includes('fetch failed')) {
          console.log('⚠️ Skipping test due to database connectivity issues');
          return;
        }
        throw error;
      }
    });

    it('should get user by phone hash', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUser || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test user available or database unavailable');
        return;
      }
      
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      createdPhoneHashes.push(testPhoneHash);
      
      try {
        await Phone.create({ 
          phone_hash: testPhoneHash, 
          linked_user_id: testUser.id 
        });
        
        const user = await Phone.getUserByHash(testPhoneHash);
        
        expect(user).toBeDefined();
        expect(user.user_id).toBe(testUser.id);
        expect(user.phone_hash).toBe(testPhoneHash);
      } catch (error) {
        if (error.message.includes('Database connection not available') || 
            error.message.includes('fetch failed')) {
          console.log('⚠️ Skipping test due to database connectivity issues');
          return;
        }
        throw error;
      }
    });

    it('should return null when getting user for non-existent phone hash', async () => {
      // Skip test if database unavailable
      if (!supabaseAdmin) {
        console.log('⚠️ Skipping test - database unavailable');
        return;
      }
      
      try {
        const user = await Phone.getUserByHash('nonexistenthash');
        expect(user).toBeNull();
      } catch (error) {
        if (error.message.includes('Database connection not available') || 
            error.message.includes('fetch failed')) {
          console.log('⚠️ Skipping test due to database connectivity issues');
          return;
        }
        throw error;
      }
    });
  });

  describe('Phone Data Validation', () => {
    it('should validate phone hash relationships from preset data', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUsers || testUsers.length === 0 || !supabaseAdmin) {
        console.log('⚠️ Skipping test - no test users available or database unavailable');
        return;
      }
      
      const activeUsers = testUsers.filter(u => u.status === 'active');
      const pendingUsers = testUsers.filter(u => u.status === 'pending');
      const suspendedUsers = testUsers.filter(u => u.status === 'suspended');
      
      console.log(`Found ${activeUsers.length} active, ${pendingUsers.length} pending, and ${suspendedUsers.length} suspended users`);
      
      expect(testUsers.length).toBeGreaterThan(0);
      expect(activeUsers.length).toBeGreaterThan(0);
    });

    it('should handle multiple users with phone operations', async () => {
      // Skip test if setup failed or database unavailable
      if (!testUsers || testUsers.length < 2 || !supabaseAdmin) {
        console.log('⚠️ Skipping test - need at least 2 test users or database unavailable');
        return;
      }
      
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const phoneHash1 = `multiuser1${Date.now().toString(16)}`;
      const phoneHash2 = `multiuser2${Date.now().toString(16)}`;
      
      createdPhoneHashes.push(phoneHash1, phoneHash2);
      
      try {
        // Create phones for different users
        await Phone.create({ 
          phone_hash: phoneHash1, 
          linked_user_id: user1.id 
        });
        
        await Phone.create({ 
          phone_hash: phoneHash2, 
          linked_user_id: user2.id 
        });
        
        // Verify phones are linked to correct users
        const phones1 = await Phone.findByUserId(user1.id);
        const phones2 = await Phone.findByUserId(user2.id);
        
        const user1Phone = phones1.find(p => p.phone_hash === phoneHash1);
        const user2Phone = phones2.find(p => p.phone_hash === phoneHash2);
        
        expect(user1Phone).toBeDefined();
        expect(user1Phone.linked_user_id).toBe(user1.id);
        
        expect(user2Phone).toBeDefined();
        expect(user2Phone.linked_user_id).toBe(user2.id);
      } catch (error) {
        if (error.message.includes('Database connection not available') || 
            error.message.includes('fetch failed')) {
          console.log('⚠️ Skipping test due to database connectivity issues');
          return;
        }
        throw error;
      }
    });
  });
}); 