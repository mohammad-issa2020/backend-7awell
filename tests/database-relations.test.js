import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import UserSettings from '../models/UserSettings.js';
import NotificationSettings from '../models/NotificationSettings.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import TransactionDetail from '../models/TransactionDetail.js';
import AssetBalance from '../models/AssetBalance.js';
import ContactsWithAccounts from '../models/ContactsWithAccounts.js';
import Phone from '../models/Phone.js';
import UserSession from '../models/UserSession.js';
import ActivityLog from '../models/ActivityLog.js';
import Promotion from '../models/Promotion.js';
import { quickSetups } from './setup/presets.js';

describe('Database Relations & Constraints', () => {
  let setup;
  let testUsers;
  let testUser;

  beforeAll(async () => {
    // load minimal setup for testing constraints
    setup = await quickSetups.auth('unit');
    testUsers = setup.getData('users');
    testUser = testUsers.find(u => u.status === 'active');
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  describe('Foreign Key Constraints', () => {
    describe('User-Related Tables', () => {
      it('should fail to create UserProfile with invalid user_id', async () => {
        const invalidUserId = uuidv4(); // random UUID that doesn't exist

        await expect(
          UserProfile.create({
            user_id: invalidUserId,
            bio: 'This should fail',
            location: 'Nowhere'
          })
        ).rejects.toThrow();
      });

      it('should fail to create UserSettings with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          UserSettings.create({
            user_id: invalidUserId,
            language: 'en',
            theme: 'light'
          })
        ).rejects.toThrow();
      });

      it('should fail to create NotificationSettings with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          NotificationSettings.create({
            user_id: invalidUserId,
            push_enabled: true
          })
        ).rejects.toThrow();
      });

      it('should fail to create Wallet with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          Wallet.create({
            user_id: invalidUserId,
            address: '0x1234567890123456789012345678901234567890',
            network: 'ethereum',
            wallet_type: 'metamask'
          })
        ).rejects.toThrow();
      });

      it('should fail to create Phone with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          Phone.create({
            user_id: invalidUserId,
            phone_number: '+1234567890',
            phone_hash: 'somehash123'
          })
        ).rejects.toThrow();
      });

      it('should fail to create UserSession with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          UserSession.create({
            user_id: invalidUserId,
            session_token: 'token123',
            device_info: 'Test Device',
            expires_at: new Date(Date.now() + 86400000)
          })
        ).rejects.toThrow();
      });

      it('should fail to create ActivityLog with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          ActivityLog.create({
            user_id: invalidUserId,
            action: 'test_action',
            resource_type: 'user',
            ip_address: '127.0.0.1'
          })
        ).rejects.toThrow();
      });
    });

    describe('Transaction-Related Tables', () => {
      it('should fail to create TransactionDetail with invalid transaction_id', async () => {
        const invalidTransactionId = uuidv4();

        await expect(
          TransactionDetail.create({
            transaction_id: invalidTransactionId,
            gas_fee: '0.001',
            network_fee: '0.0005',
            exchange_rate: '2000.00'
          })
        ).rejects.toThrow();
      });
    });

    describe('Contact-Related Tables', () => {
      it('should fail to create ContactsWithAccounts with invalid user_id', async () => {
        const invalidUserId = uuidv4();

        await expect(
          ContactsWithAccounts.create({
            user_id: invalidUserId,
            contact_user_id: testUser.id,
            contact_name: 'Test Contact',
            relationship_type: 'friend'
          })
        ).rejects.toThrow();
      });

      it('should fail to create ContactsWithAccounts with invalid contact_user_id', async () => {
        const invalidContactUserId = uuidv4();

        await expect(
          ContactsWithAccounts.create({
            user_id: testUser.id,
            contact_user_id: invalidContactUserId,
            contact_name: 'Invalid Contact',
            relationship_type: 'friend'
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('Unique Constraints', () => {
    it('should fail to create duplicate user email', async () => {
      const userData = {
        phone: '+9876543210',
        email: testUser.email, // same email as existing user
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create duplicate user phone', async () => {
      const userData = {
        phone: testUser.phone, // same phone as existing user
        email: 'newemail@example.com',
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create duplicate username if unique constraint exists', async () => {
      if (testUser.username) {
        const userData = {
          phone: '+1111111111',
          email: 'newuser@example.com',
          username: testUser.username, // same username
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        };

        await expect(User.create(userData)).rejects.toThrow();
      }
    });

  });

  describe('Not Null Constraints', () => {
    it('should fail to create User without required phone', async () => {
      await expect(
        User.create({
          // phone: missing!
          email: 'nophone@example.com',
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        })
      ).rejects.toThrow();
    });

    it('should fail to create User without required email', async () => {
      await expect(
        User.create({
          phone: '+1234567890',
          // email: missing!
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        })
      ).rejects.toThrow();
    });

    it('should fail to create Wallet without required address', async () => {
      await expect(
        Wallet.create({
          user_id: testUser.id,
          // address: missing!
          network: 'ethereum',
          wallet_type: 'metamask'
        })
      ).rejects.toThrow();
    });


    it('should fail to create Phone without required phone_number', async () => {
      await expect(
        Phone.create({
          user_id: testUser.id,
          // phone_number: missing!
          phone_hash: 'hash123'
        })
      ).rejects.toThrow();
    });
  });

  describe('Check Constraints & Data Validation', () => {
  

    it('should fail to create User with invalid status', async () => {
      await expect(
        User.create({
          phone: '+1234567890',
          email: 'invalid@example.com',
          phone_verified: false,
          email_verified: false,
          status: 'invalid_status', // invalid enum value
          kyc_level: 'none'
        })
      ).rejects.toThrow();
    });

    it('should fail to create User with invalid KYC level', async () => {
      await expect(
        User.create({
          phone: '+1234567890',
          email: 'invalid@example.com',
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'invalid_level' // invalid enum value
        })
      ).rejects.toThrow();
    });


    it('should fail to create invalid email format', async () => {
      await expect(
        User.create({
          phone: '+1234567890',
          email: 'invalid-email-format', // invalid email
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        })
      ).rejects.toThrow();
    });

    it('should fail to create invalid phone format', async () => {
      await expect(
        User.create({
          phone: 'invalid-phone', // invalid phone format
          email: 'valid@example.com',
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        })
      ).rejects.toThrow();
    });
  });



  describe('Referential Integrity Complex Cases', () => {
   
    it('should prevent self-referential contacts', async () => {
      // user cannot add themselves as contact
      await expect(
        ContactsWithAccounts.create({
          user_id: testUser.id,
          contact_user_id: testUser.id, // same user
          contact_name: 'Myself',
          relationship_type: 'self'
        })
      ).rejects.toThrow();
    });

  });

  describe('Database Constraint Error Messages', () => {
    it('should provide meaningful error for foreign key violations', async () => {
      try {
        await UserProfile.create({
          user_id: uuidv4(),
          bio: 'This will fail'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // verify error message contains useful information
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        
        // check if error message mentions foreign key or constraint
        const errorText = error.message.toLowerCase();
        const hasForeignKeyInfo = 
          errorText.includes('foreign') || 
          errorText.includes('constraint') ||
          errorText.includes('reference') ||
          errorText.includes('violate');
        
        expect(hasForeignKeyInfo).toBe(true);
      }
    });

    it('should provide meaningful error for unique constraint violations', async () => {
      try {
        await User.create({
          phone: testUser.phone, // duplicate phone
          email: 'different@email.com',
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        
        // check if error mentions uniqueness
        const errorText = error.message.toLowerCase();
        const hasUniqueInfo = 
          errorText.includes('unique') || 
          errorText.includes('duplicate') ||
          errorText.includes('already exists');
        
        expect(hasUniqueInfo).toBe(true);
      }
    });

    it('should provide meaningful error for not null violations', async () => {
      try {
        await User.create({
          // phone: missing required field
          email: 'missing@phone.com',
          phone_verified: false,
          email_verified: false,
          status: 'active',
          kyc_level: 'none'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

 
}); 