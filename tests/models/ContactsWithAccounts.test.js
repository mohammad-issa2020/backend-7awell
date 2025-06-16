import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ContactsWithAccounts from '../../models/ContactsWithAccounts.js';
import User from '../../models/User.js';

describe('ContactsWithAccounts Model', () => {
  let testUser;
  let testContact;
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
    if (testContact) {
      try {
        await ContactsWithAccounts.delete(testContact.id);
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
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
    it('should create a new contact', async () => {
      const data = {
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: true
      };

      testContact = await ContactsWithAccounts.create(data);

      expect(testContact).toBeDefined();
      expect(testContact.owner_id).toBe(testUser.id);
      expect(testContact.phone_hash).toBe(testPhoneHash);
      expect(testContact.is_favorite).toBe(true);
    });

    it('should fail to create contact with missing required fields', async () => {
      const data = { phone_hash: testPhoneHash };

      await expect(ContactsWithAccounts.create(data))
        .rejects
        .toThrow('Missing required field: owner_id');
    });

    it('should find contact by ID', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const found = await ContactsWithAccounts.findById(testContact.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(testContact.id);
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);
    });

    it('should return null when contact not found', async () => {
      const found = await ContactsWithAccounts.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('should find contacts by owner ID', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: true
      });

      const found = await ContactsWithAccounts.findByOwnerId(testUser.id);

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].id).toBe(testContact.id);
      expect(found[0].owner_id).toBe(testUser.id);
      expect(found[0].phone_hash).toBe(testPhoneHash);
      expect(found[0].is_favorite).toBe(true);
    });

    it('should find contact by owner ID and phone hash', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const found = await ContactsWithAccounts.findByOwnerAndPhone(testUser.id, testPhoneHash);

      expect(found).toBeDefined();
      expect(found.id).toBe(testContact.id);
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);
    });

    it('should update contact', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: false
      });

      const updated = await ContactsWithAccounts.update(testContact.id, {
        is_favorite: true
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(testContact.id);
      expect(updated.is_favorite).toBe(true);
    });

    it('should delete contact', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const deleted = await ContactsWithAccounts.delete(testContact.id);
      expect(deleted).toBe(true);

      const found = await ContactsWithAccounts.findById(testContact.id);
      expect(found).toBeNull();
    });
  });

  describe('Stored Procedure Operations', () => {
    it('should add contact using stored procedure', async () => {
      const contactId = await ContactsWithAccounts.addContact(
        testUser.id,
        testPhoneHash,
        true
      );

      expect(contactId).toBeDefined();

      const found = await ContactsWithAccounts.findById(contactId);
      expect(found).toBeDefined();
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);
      expect(found.is_favorite).toBe(true);
    });

    it('should update contact using stored procedure', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: false
      });

      const updated = await ContactsWithAccounts.updateContact(
        testContact.id,
        true
      );

      expect(updated).toBe(true);

      const found = await ContactsWithAccounts.findById(testContact.id);
      expect(found.is_favorite).toBe(true);
    });

    it('should delete contact using stored procedure', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const deleted = await ContactsWithAccounts.deleteContact(testContact.id);
      expect(deleted).toBe(true);

      const found = await ContactsWithAccounts.findById(testContact.id);
      expect(found).toBeNull();
    });

    it('should get contact by ID using stored procedure', async () => {
      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: true
      });

      const found = await ContactsWithAccounts.getContactById(testContact.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(testContact.id);
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);
      expect(found.is_favorite).toBe(true);
    });
  });
}); 