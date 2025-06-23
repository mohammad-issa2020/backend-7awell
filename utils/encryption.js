import crypto from 'crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const DETERMINISTIC_IV_SALT = 'a-fixed-salt-for-7awell-deterministic-iv';

/**
 * Derives a proper encryption key from the config key.
 * @param {string} configKey - Key from configuration.
 * @returns {Buffer} - Derived encryption key.
 */
function deriveKey(configKey) {
  if (!configKey || configKey === 'your-encryption-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in environment variables for production use');
    }
    configKey = 'test-encryption-key-for-7awell-wallet-2024-secure-testing-environment';
  }
  return crypto.pbkdf2Sync(configKey, 'wallet-salt-7awell', 100000, KEY_LENGTH, 'sha256');
}

const encryptionKey = deriveKey(config.security.encryptionKey);

/**
 * Derives a static IV for deterministic encryption.
 * @returns {Buffer} - A static 16-byte IV.
 */
function getDeterministicIV() {
  return crypto.createHash('sha256')
    .update(encryptionKey.toString('hex') + DETERMINISTIC_IV_SALT)
    .digest()
    .slice(0, IV_LENGTH);
}

/**
 * Encrypts data deterministically (same input -> same output).
 * @param {string} plaintext - Data to encrypt.
 * @returns {string} - Hex-encoded encrypted data.
 */
function encryptDeterministic(plaintext) {
  if (!plaintext) throw new Error('Cannot encrypt empty data');
  try {
    const iv = getDeterministicIV();
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('❌ Deterministic encryption error:', error);
    throw new Error(`Failed to encrypt data deterministically: ${error.message}`);
  }
}

/**
 * Decrypts deterministically encrypted data.
 * @param {string} ciphertext - Hex-encoded encrypted data.
 * @returns {string} - Decrypted plaintext.
 */
function decryptDeterministic(ciphertext) {
  if (!ciphertext) throw new Error('Cannot decrypt empty data');
  try {
    const iv = getDeterministicIV();
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Deterministic decryption error:', error);
    // Return original text on failure to avoid breaking flows if a non-encrypted value is passed.
    return ciphertext;
  }
}

/**
 * Validates wallet address format (Ethereum or Solana).
 * @param {string} address - Wallet address to validate.
 * @returns {boolean} - True if valid format.
 */
export function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
  return ethRegex.test(address) || solanaRegex.test(address);
}

/**
 * Encrypts a wallet address using deterministic encryption.
 * @param {string} walletAddress - The wallet address to encrypt.
 * @returns {string} - The encrypted wallet address.
 */
export function encryptWalletAddress(walletAddress) {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error('Invalid wallet address format for encryption.');
  }
  return encryptDeterministic(walletAddress.toLowerCase());
}

/**
 * Decrypts a wallet address.
 * @param {string} encryptedAddress - The encrypted wallet address.
 * @returns {string} - The decrypted wallet address.
 */
export function decryptWalletAddress(encryptedAddress) {
  if (!encryptedAddress) return encryptedAddress;
  // Deterministic decryption will return the original value on error.
  return decryptDeterministic(encryptedAddress);
}

// Note: The non-deterministic encryption functions and private key/metadata functions
// have been removed for simplicity as they are not needed for this approach.
// If you need to encrypt other data non-deterministically, they can be re-added.

const encryptionService = {
  isValidWalletAddress,
  encryptWalletAddress,
  decryptWalletAddress,
  // Keep the deterministic functions internal for now
};

export default encryptionService; 