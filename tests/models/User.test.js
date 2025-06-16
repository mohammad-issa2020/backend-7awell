import { describe, it, expect, beforeEach } from 'vitest';
import User from '../../models/User.js';

describe('User Model', () => {
  let testUser;

  beforeEach(async () => {
    // Destroy only test users (those with email ending in '@example.com')
    await User.destroy({ where: { email: { endsWith: '@example.com' } } });

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

  describe('Create', () => {
    it('should create a new user successfully', async () => {
      const user = await User.create({
        phone: '+1987654321',
        email: 'jane.smith@example.com',
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      });

      expect(user).toBeDefined();
      expect(user.phone).toBe('+1987654321');
      expect(user.email).toBe('jane.smith@example.com');
      expect(user.status).toBe('active');
      expect(user.kyc_level).toBe('none');
    });

    it('should not create user with duplicate email', async () => {
      await expect(User.create({
        phone: '+1234567891',
        email: testUser.email, // Duplicate email
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      })).rejects.toThrow();
    });

    it('should not create user with duplicate phone', async () => {
      await expect(User.create({
        phone: testUser.phone, // Duplicate phone
        email: 'unique.email@example.com',
        phone_verified: false,
        email_verified: false,
        status: 'active',
        kyc_level: 'none'
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {
    it('should find user by id', async () => {
      const foundUser = await User.findByPk(testUser.id);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(testUser.email);
    });

    it('should find user by email', async () => {
      const foundUser = await User.findOne({ where: { email: testUser.email } });
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(testUser.id);
    });
  });

  describe('Update', () => {
    it('should update user successfully', async () => {
      const newPhone = '+1111111111';
      
      // Create User instance for update
      const userInstance = new User(testUser);
      await userInstance.update({ phone: newPhone });

      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.phone).toBe(newPhone);
    });
  });

  describe('Delete', () => {
    it('should delete user successfully', async () => {
      // Create User instance for delete
      const userInstance = new User(testUser);
      await userInstance.destroy();

      const deletedUser = await User.findByPk(testUser.id);
      expect(deletedUser).toBeNull();
    });
  });
}); 