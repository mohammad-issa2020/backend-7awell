import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ContactsWithAccounts from '../../models/ContactsWithAccounts.js';
import User from '../../models/User.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('ContactsWithAccounts Model', () => {
  let setup;
  let testUsers;
  let testUser;
  let testContact;
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
    it('should create a new contact', async () => {
      // generate unique phone hash for each test
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should fail to create contact with missing required fields', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;
      const data = { phone_hash: testPhoneHash };

      await expect(ContactsWithAccounts.create(data))
        .rejects
        .toThrow('Missing required field: owner_id');
    });

    it('should find contact by ID', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const found = await ContactsWithAccounts.findById(testContact.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(testContact.id);
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should return null when contact not found', async () => {
      const found = await ContactsWithAccounts.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('should find contacts by owner ID', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash,
        is_favorite: true
      });

      const found = await ContactsWithAccounts.findByOwnerId(testUser.id);

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThan(0);
      
      const createdContact = found.find(c => c.id === testContact.id);
      expect(createdContact).toBeDefined();
      expect(createdContact.owner_id).toBe(testUser.id);
      expect(createdContact.phone_hash).toBe(testPhoneHash);
      expect(createdContact.is_favorite).toBe(true);

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should find contact by owner ID and phone hash', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

      testContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: testPhoneHash
      });

      const found = await ContactsWithAccounts.findByOwnerAndPhone(testUser.id, testPhoneHash);

      expect(found).toBeDefined();
      expect(found.id).toBe(testContact.id);
      expect(found.owner_id).toBe(testUser.id);
      expect(found.phone_hash).toBe(testPhoneHash);

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should update contact', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should delete contact', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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

      // clean up
      await ContactsWithAccounts.delete(contactId);
    });

    it('should update contact using stored procedure', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });

    it('should delete contact using stored procedure', async () => {
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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
      testPhoneHash = `testphonehash${Date.now().toString(16)}`;

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

      // clean up
      await ContactsWithAccounts.delete(testContact.id);
    });
  });

  describe('Contact Data Validation', () => {
    it('should validate contact relationships from preset data', async () => {
      // verify users from preset have expected structure
      const activeUsers = testUsers.filter(u => u.status === 'active');
      const pendingUsers = testUsers.filter(u => u.status === 'pending');
      
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(pendingUsers.length).toBeGreaterThan(0);
      
      // verify each user has required fields for contact operations
      testUsers.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.status).toBeDefined();
        expect(['active', 'pending', 'inactive'].includes(user.status)).toBe(true);
      });
    });

    it('should handle multiple users with contact operations', async () => {
      // use different users from preset
      const user1 = testUsers.find(u => u.status === 'active');
      const user2 = testUsers.find(u => u.status === 'pending');
      
      const phoneHash1 = `multicontact1${Date.now().toString(16)}`;
      const phoneHash2 = `multicontact2${Date.now().toString(16)}`;
      
      // create contacts for different users
      const contact1 = await ContactsWithAccounts.create({
        owner_id: user1.id,
        phone_hash: phoneHash1,
        is_favorite: true
      });

      const contact2 = await ContactsWithAccounts.create({
        owner_id: user2.id,
        phone_hash: phoneHash2,
        is_favorite: false
      });
      
      // verify both contacts exist
      expect(contact1.owner_id).toBe(user1.id);
      expect(contact2.owner_id).toBe(user2.id);
      expect(contact1.is_favorite).toBe(true);
      expect(contact2.is_favorite).toBe(false);
      
      // clean up
      await ContactsWithAccounts.delete(contact1.id);
      await ContactsWithAccounts.delete(contact2.id);
    });

    it('should validate favorite contact functionality', async () => {
      const phoneHash1 = `fav1${Date.now().toString(16)}`;
      const phoneHash2 = `fav2${Date.now().toString(16)}`;
      
      // create favorite and non-favorite contacts
      const favoriteContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: phoneHash1,
        is_favorite: true
      });

      const regularContact = await ContactsWithAccounts.create({
        owner_id: testUser.id,
        phone_hash: phoneHash2,
        is_favorite: false
      });

      // verify favorite status
      expect(favoriteContact.is_favorite).toBe(true);
      expect(regularContact.is_favorite).toBe(false);

      // test toggling favorite status
      const updatedContact = await ContactsWithAccounts.update(regularContact.id, {
        is_favorite: true
      });
      expect(updatedContact.is_favorite).toBe(true);

      // clean up
      await ContactsWithAccounts.delete(favoriteContact.id);
      await ContactsWithAccounts.delete(regularContact.id);
    });

    it('should validate contact ownership distribution', async () => {
      // create multiple contacts for same user
      const phoneHashes = [
        `owner1${Date.now().toString(16)}`,
        `owner2${Date.now().toString(16)}`,
        `owner3${Date.now().toString(16)}`
      ];
      
      const contacts = await Promise.all(
        phoneHashes.map(hash => ContactsWithAccounts.create({
          owner_id: testUser.id,
          phone_hash: hash,
          is_favorite: Math.random() > 0.5
        }))
      );

      // verify all contacts belong to same user
      contacts.forEach(contact => {
        expect(contact.owner_id).toBe(testUser.id);
        expect(contact.phone_hash).toBeDefined();
        expect(typeof contact.is_favorite).toBe('boolean');
      });

      // verify different phone hashes
      const contactPhoneHashes = contacts.map(c => c.phone_hash);
      expect(new Set(contactPhoneHashes).size).toBe(3); // all unique

      // clean up
      await Promise.all(contacts.map(c => ContactsWithAccounts.delete(c.id)));
    });
  });
}); 