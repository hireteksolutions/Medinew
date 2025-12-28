import CryptoJS from 'crypto-js';

/**
 * Server-side password decryption utility
 * Decrypts password received from client before hashing with bcrypt
 * 
 * SECURITY NOTE:
 * - This decrypts the password that was encrypted on the client side
 * - After decryption, password is hashed with bcrypt before storage
 * - The encryption key must match the client-side key
 */

// Encryption key - must match client-side key
// Should be stored in environment variables
const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'medinew-secret-encryption-key-change-in-production';

/**
 * Decrypt password received from client
 * @param {string} encryptedPassword - Encrypted password string from client
 * @returns {string} Decrypted password (plain text)
 */
export const decryptPassword = (encryptedPassword) => {
  try {
    // Check if password is already encrypted (starts with encryption markers)
    // If not encrypted, return as-is (backward compatibility)
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      return encryptedPassword;
    }

    // Check if it looks like encrypted data (AES encrypted strings start with "U2FsdGVkX1")
    // This is the base64 encoding of "Salted__" which crypto-js uses
    const isEncryptedFormat = encryptedPassword.startsWith('U2FsdGVkX1');

    // If it doesn't look encrypted, return as-is (backward compatibility)
    if (!isEncryptedFormat) {
      // Check if it's a very short password (likely not encrypted)
      // Most encrypted passwords will be at least 24 characters
      if (encryptedPassword.length < 24) {
        return encryptedPassword; // Likely plain text password
      }
      // For longer strings that don't start with encryption marker, try to decrypt anyway
      // (might be encrypted with different method or format)
    }

    // Try to decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    const decryptedPassword = decrypted.toString(CryptoJS.enc.Utf8);

    // If decryption resulted in empty string, the password was likely not encrypted
    if (!decryptedPassword || decryptedPassword.length === 0) {
      // Return original for backward compatibility (might be plain text)
      return encryptedPassword;
    }

    return decryptedPassword;
  } catch (error) {
    console.error('Password decryption error:', error);
    // If decryption fails, assume password was not encrypted (backward compatibility)
    // In production, you might want to throw an error instead
    return encryptedPassword;
  }
};

/**
 * Check if password appears to be encrypted
 * @param {string} password - Password string to check
 * @returns {boolean} True if password appears to be encrypted
 */
export const isEncrypted = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  // Encrypted AES strings are typically longer and base64-like
  return password.length >= 50;
};

