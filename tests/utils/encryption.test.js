import { describe, it, expect } from 'vitest';
import encryptionService, {
  encryptWalletAddress,
  decryptWalletAddress,
  encryptPrivateKey,
  decryptPrivateKey,
  generateAddressHash,
  encryptTransactionMetadata,
  decryptTransactionMetadata,
  isValidWalletAddress
} from '../../utils/encryption.js';

describe('🔐 Deterministic Encryption Service', () => {

  const addresses = {
    ethereum: {
      valid: '0x742d35cc6634c0532925a3b8d0c05c1b8a9c8e9e',
      invalid: '0x742d35cc6634c0532925a3b8d0c05c1b8a9c8e9', // too short
    },
    solana: {
      valid: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      invalid: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW', // too short
    },
  };

  describe('Wallet Address Validation', () => {
    it('should correctly validate Ethereum addresses', () => {
      expect(isValidWalletAddress(addresses.ethereum.valid)).toBe(true);
      expect(isValidWalletAddress(addresses.ethereum.invalid)).toBe(false);
      expect(isValidWalletAddress('not-an-address')).toBe(false);
      expect(isValidWalletAddress(null)).toBe(false);
    });

    it('should correctly validate Solana addresses', () => {
      expect(isValidWalletAddress(addresses.solana.valid)).toBe(true);
      expect(isValidWalletAddress(addresses.solana.invalid)).toBe(false);
    });
  });

  describe('Deterministic Wallet Address Encryption', () => {
    it('should encrypt and decrypt an Ethereum address successfully', () => {
      const originalAddress = addresses.ethereum.valid;
      const encrypted = encryptWalletAddress(originalAddress);
      const decrypted = decryptWalletAddress(encrypted);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalAddress);
      expect(decrypted).toBe(originalAddress.toLowerCase());
    });

    it('should encrypt and decrypt a Solana address successfully', () => {
      const originalAddress = addresses.solana.valid;
      const encrypted = encryptWalletAddress(originalAddress);
      const decrypted = decryptWalletAddress(encrypted);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalAddress);
      expect(decrypted).toBe(originalAddress.toLowerCase());
    });

    it('should produce the same encrypted output for the same address (deterministic)', () => {
      const originalAddress = addresses.ethereum.valid;
      const encrypted1 = encryptWalletAddress(originalAddress);
      const encrypted2 = encryptWalletAddress(originalAddress);

      expect(encrypted1).toBe(encrypted2);
    });
    
    it('should handle decryption of non-encrypted or malformed data gracefully', () => {
        const malformedData = 'not-a-real-encrypted-string';
        // The service is designed to return the original string on decryption failure
        expect(decryptWalletAddress(malformedData)).toBe(malformedData);
    });

    it('should throw an error when trying to encrypt an invalid address format', () => {
      const invalidAddress = addresses.ethereum.invalid;
      expect(() => encryptWalletAddress(invalidAddress)).toThrow('Invalid wallet address format for encryption.');
    });
  });

  describe('Service Object Export', () => {
    it('should export the correct functions on the default service object', () => {
        expect(encryptionService).toBeDefined();
        expect(typeof encryptionService.isValidWalletAddress).toBe('function');
        expect(typeof encryptionService.encryptWalletAddress).toBe('function');
        expect(typeof encryptionService.decryptWalletAddress).toBe('function');
    });
  });
});
