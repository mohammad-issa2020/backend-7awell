import crypto from 'crypto';

/**
 * Generates a hash for a phone number
 * @param {string} phone - The phone number to hash
 * @returns {string} The hashed phone number
 */
export const generatePhoneHash = (phone) => {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove any non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(cleanPhone);
  
  return hash.digest('hex');
};

/**
 * Validates a phone number format
 * @param {string} phone - The phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  
  // Remove any non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if the phone number has a valid length (between 10 and 15 digits)
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}; 