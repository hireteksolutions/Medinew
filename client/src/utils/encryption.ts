import CryptoJS from 'crypto-js';

/**
 * Client-side password encryption utility
 * Encrypts password before sending to server (additional layer of security)
 * 
 * SECURITY NOTE:
 * - This is an ADDITIONAL layer on top of HTTPS
 * - HTTPS is still REQUIRED in production to encrypt all traffic
 * - This helps protect passwords even if HTTPS is compromised
 * - The encryption key should be stored in environment variables
 */

// Encryption key - should match server-side key
// In production, this should come from environment variables
const ENCRYPTION_KEY = import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY || 'medinew-secret-encryption-key-change-in-production';

/**
 * Encrypt password before sending to server
 * @param password - Plain text password
 * @returns Encrypted password string
 */
export const encryptPassword = (password: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    // If encryption fails, return original password (should not happen, but fail gracefully)
    return password;
  }
};

/**
 * Decrypt password (mainly for testing/debugging on client side)
 * @param encryptedPassword - Encrypted password string
 * @returns Decrypted password (plain text)
 */
export const decryptPassword = (encryptedPassword: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error('Failed to decrypt password');
  }
};

