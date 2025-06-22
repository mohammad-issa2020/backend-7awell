import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import User from '../../models/User.js';
import ContactSyncStatus from '../../models/ContactSyncStatus.js';
import ContactsWithAccounts from '../../models/ContactsWithAccounts.js';
import Phone from '../../models/Phone.js';
import { supabase } from '../../database/supabase.js';
import { generatePhoneHash } from '../../utils/phone.js';

describe('Contact Sync Integration Tests', () => {
  // Production-like test data size
  const TEST_USERS_COUNT = 5;
  const MIN_CONTACTS = 2;
  const MAX_CONTACTS = 5;
  const BATCH_SIZE = 2;
  const MAX_RETRIES = 5;
  const CONCURRENT_BATCHES = 1;
  const RETRY_DELAY = 2000;
  let testUsers = [];
  let testPhones = [];
  let createdUserIds = new Set();
  let usedPhoneHashes = new Set(); // Track used phone hashes

  // Helper function to generate random phone number
  const generateRandomPhone = () => {
    return `+1${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
  };

  // Helper function to generate unique phone hash
  const generateUniquePhoneHash = () => {
    let phoneHash;
    do {
      const phone = generateRandomPhone();
      phoneHash = generatePhoneHash(phone);
    } while (usedPhoneHashes.has(phoneHash));
    usedPhoneHashes.add(phoneHash);
    return phoneHash;
  };

  // Helper function to generate random email
  const generateRandomEmail = () => {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
  };

  // Helper function to generate random contacts for a user
  const generateRandomContacts = (count) => {
    const contacts = [];
    for (let i = 0; i < count; i++) {
      contacts.push({
        phone_hash: generateUniquePhoneHash(),
        is_favorite: Math.random() > 0.8
      });
    }
    return contacts;
  };

  // Helper function to retry failed operations with exponential backoff
  const retryOperation = async (operation, maxRetries = MAX_RETRIES) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error.message.includes('duplicate key') || error.message.includes('foreign key constraint')) {
          throw error;
        }
        const delay = Math.min(RETRY_DELAY * Math.pow(2, i), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  };

  // Helper function to process batches with concurrency control
  const processBatches = async (items, batchSize, processFn, maxConcurrent = CONCURRENT_BATCHES) => {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results = [];
    for (let i = 0; i < batches.length; i += maxConcurrent) {
      const concurrentBatches = batches.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        concurrentBatches.map(batch => processFn(batch))
      );
      results.push(...batchResults);
      if (i + maxConcurrent < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return results;
  };

  // Helper function to cleanup user data with retries
  const cleanupUserData = async (user) => {
    if (!user || !user.id) return;
    
    try {
      const contacts = await retryOperation(() => ContactsWithAccounts.findByOwnerId(user.id));
      if (contacts && contacts.length > 0) {
        await processBatches(
          contacts,
          BATCH_SIZE,
          async (batch) => {
            await Promise.all(batch.map(contact => 
              retryOperation(() => ContactsWithAccounts.delete(contact.id))
            ));
          }
        );
      }
      
      await retryOperation(() => ContactSyncStatus.delete(user.id));
      
      const phones = await retryOperation(() => Phone.findByUserId(user.id));
      if (phones && phones.length > 0) {
        await processBatches(
          phones,
          BATCH_SIZE,
          async (batch) => {
            await Promise.all(batch.map(phone => 
              retryOperation(() => Phone.delete(phone.phone_hash))
            ));
          }
        );
      }
      
      const userInstance = new User(user);
      await retryOperation(() => userInstance.destroy());
      createdUserIds.delete(user.id);
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  };

  // Setup test users and phone hashes
  beforeAll(async () => {
    try {
      await supabase.from('contacts_with_accounts').delete().gt('created_at', '1900-01-01');
      await supabase.from('contact_sync_status').delete().gt('created_at', '1900-01-01');
      await supabase.from('users').delete().gt('created_at', '1900-01-01');
      console.log('✅ Tables cleaned: users, contact_sync_status, contacts_with_accounts');

      const { count: count1 } = await supabase.from('contacts_with_accounts').select('*', { count: 'exact' });
      const { count: count2 } = await supabase.from('contact_sync_status').select('*', { count: 'exact' });
      const { count: count3 } = await supabase.from('users').select('*', { count: 'exact' });
      console.log('Counts after delete:', { count1, count2, count3 });
    } catch (e) {
      console.warn('⚠️ Failed to clean tables:', e.message);
    }

    // Clear any existing test data
    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', 'test_%');

    if (error) {
      console.warn('Error fetching existing users:', error.message);
    } else if (existingUsers && existingUsers.length > 0) {
      await processBatches(
        existingUsers,
        BATCH_SIZE,
        async (batch) => {
          await Promise.all(batch.map(cleanupUserData));
        },
        CONCURRENT_BATCHES
      );
    }

    // Create test users in smaller batches
    for (let i = 0; i < TEST_USERS_COUNT; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TEST_USERS_COUNT - i);
      const batch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const user = await retryOperation(async () => {
          const newUser = await User.create({
            phone: generateRandomPhone(),
            email: generateRandomEmail(),
            status: 'active',
            kyc_level: 'basic',
            phone_verified: true,
            email_verified: true
          });
          createdUserIds.add(newUser.id);
          return newUser;
        });
        batch.push(user);
      }
      
      testUsers.push(...batch);
      
      // Add delay between batches
      if (i + BATCH_SIZE < TEST_USERS_COUNT) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }, 300000);

  // Cleanup test data
  afterAll(async () => {
    await processBatches(
      Array.from(createdUserIds).map(id => testUsers.find(u => u.id === id)).filter(Boolean),
      BATCH_SIZE,
      async (batch) => {
        await Promise.all(batch.map(cleanupUserData));
      },
      CONCURRENT_BATCHES
    );
  }, 300000);

  describe('Single User Contact Sync', () => {
    let testUser;
    let testContacts;

    beforeEach(async () => {
      testUser = await retryOperation(async () => {
        const user = await User.create({
          phone: generateRandomPhone(),
          email: generateRandomEmail(),
          status: 'active',
          kyc_level: 'basic',
          phone_verified: true,
          email_verified: true
        });
        createdUserIds.add(user.id);
        return user;
      });

      const contactsCount = Math.floor(Math.random() * (MAX_CONTACTS - MIN_CONTACTS + 1)) + MIN_CONTACTS;
      testContacts = generateRandomContacts(contactsCount);
    });

    afterEach(async () => {
      await cleanupUserData(testUser);
    });

    it('should sync contacts for a single user', async () => {
      let syncStatus = await ContactSyncStatus.findByUserId(testUser.id);
      if (!syncStatus) {
        syncStatus = await retryOperation(() => ContactSyncStatus.create({
          user_id: testUser.id,
          device_contacts_count: testContacts.length,
          synced_contacts_count: 0,
          status: 'pending'
        }));
      }

      const startTime = Date.now();
      
      await processBatches(
        testContacts,
        BATCH_SIZE,
        async (batch) => {
          await Promise.all(batch.map(contact => 
            retryOperation(() => ContactsWithAccounts.create({
              owner_id: testUser.id,
              phone_hash: contact.phone_hash,
              is_favorite: contact.is_favorite
            }))
          ));
        }
      );

      const endTime = Date.now();

      await retryOperation(() => ContactSyncStatus.update(testUser.id, {
        synced_contacts_count: testContacts.length,
        status: 'completed'
      }));
      console.log('Updated sync status for user', testUser.id);

      const finalStatus = await retryOperation(() => ContactSyncStatus.findByUserId(testUser.id));
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.synced_contacts_count).toBe(testContacts.length);

      const syncTime = endTime - startTime;
      console.log(`Single user sync time: ${syncTime}ms for ${testContacts.length} contacts`);
      expect(syncTime).toBeLessThan(30000);
    }, 60000);
  });

  describe('Concurrent User Contact Sync', () => {
    it('should handle concurrent contact syncs efficiently', async () => {
      const startTime = Date.now();

      await processBatches(
        testUsers,
        BATCH_SIZE,
        async (batch) => {
          await Promise.all(batch.map(async user => {
            const contactsCount = Math.floor(Math.random() * (MAX_CONTACTS - MIN_CONTACTS + 1)) + MIN_CONTACTS;
            const contacts = generateRandomContacts(contactsCount);

            await retryOperation(async () => {
              let syncStatus = await ContactSyncStatus.findByUserId(user.id);
              if (!syncStatus) {
                await ContactSyncStatus.create({
                  user_id: user.id,
                  device_contacts_count: contacts.length,
                  synced_contacts_count: 0,
                  status: 'pending'
                });
              }
// create function in database for add contact with account

              await processBatches(
                contacts,
                BATCH_SIZE,
                async (contactBatch) => {
                  await Promise.all(contactBatch.map(contact =>
                    ContactsWithAccounts.create({
                      owner_id: user.id,
                      phone_hash: contact.phone_hash,
                      is_favorite: contact.is_favorite
                    })
                  ));
                }
              );

              await ContactSyncStatus.update(user.id, {
                synced_contacts_count: contacts.length,
                status: 'completed'
              });
              console.log('Updated sync status for user', user.id);
            });
          }));
        },
        CONCURRENT_BATCHES
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      console.log(`Total sync time for ${TEST_USERS_COUNT} users: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(600000);

      const pendingSyncs = await retryOperation(() => ContactSyncStatus.getPendingSyncs());
      const testUserIds = testUsers.map(u => u.id);
      const testPendingSyncs = pendingSyncs.filter(sync => testUserIds.includes(sync.user_id));
      console.log('Pending syncs for test users:', testPendingSyncs);
      expect(testPendingSyncs.length).toBe(0);

      const failedSyncs = await retryOperation(() => ContactSyncStatus.getFailedSyncs());
      expect(failedSyncs.length).toBe(0);
    }, 600000);
  });
}); 