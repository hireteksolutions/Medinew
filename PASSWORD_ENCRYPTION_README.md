# Password Encryption Implementation

## Overview

This application now includes client-side password encryption as an **additional layer of security** on top of HTTPS. Passwords are encrypted on the client side before being sent to the server, then decrypted on the server before being hashed with bcrypt for storage.

## Security Architecture

1. **Client-Side Encryption**: Password is encrypted using AES encryption before sending to server
2. **HTTPS/TLS**: The encrypted password is sent over HTTPS (encrypted in transit)
3. **Server-Side Decryption**: Password is decrypted on the server
4. **BCrypt Hashing**: Decrypted password is hashed with bcrypt (with salt) before storage
5. **Storage**: Only the bcrypt hash is stored in the database (never plain text or encrypted password)

## Configuration

### Environment Variables

You need to set the same encryption key on both client and server:

**Server (.env)**
```env
PASSWORD_ENCRYPTION_KEY=your-secret-encryption-key-minimum-32-characters-long-change-in-production
```

**Client (.env)**
```env
VITE_PASSWORD_ENCRYPTION_KEY=your-secret-encryption-key-minimum-32-characters-long-change-in-production
```

**IMPORTANT**: 
- The keys MUST match between client and server
- Use a strong, randomly generated key (minimum 32 characters)
- Change the default key in production
- Never commit the actual key to version control

### Default Key (Development Only)

If no environment variable is set, a default key is used:
- `medinew-secret-encryption-key-change-in-production`

**⚠️ WARNING**: The default key is for development only. You MUST change it in production!

## Implementation Details

### Client-Side (`client/src/utils/encryption.ts`)

- Uses `crypto-js` library for AES encryption
- `encryptPassword()` function encrypts passwords before API calls
- Used in: Login, Register, Password Reset forms

### Server-Side (`server/utils/encryption.js`)

- Uses `crypto-js` library for AES decryption
- `decryptPassword()` function decrypts passwords received from client
- Backward compatible: If decryption fails, assumes password was not encrypted (for migration period)

### Where Encryption is Applied

1. **Login** (`/api/auth/login`)
2. **Registration** (`/api/auth/register`)
3. **Password Reset** (`/api/auth/reset-password`)

## Important Security Notes

### Why Client-Side Encryption?

While HTTPS already encrypts all traffic, client-side encryption adds:
- **Defense in Depth**: Additional layer of protection
- **Compliance**: Some regulations require multiple encryption layers
- **Peace of Mind**: Passwords are not visible in plain text in browser dev tools

### Limitations

1. **Key Management**: The encryption key is visible in client-side code. This is a trade-off - it's not as secure as public-key cryptography, but it's practical for most use cases.

2. **HTTPS is Still Required**: Client-side encryption does NOT replace HTTPS. Always use HTTPS in production.

3. **Not True End-to-End Encryption**: The server can decrypt the password. This is intentional - the server needs the plain password to hash it with bcrypt.

### Best Practices

1. ✅ **Use HTTPS in production** - This is the primary encryption layer
2. ✅ **Change the default encryption key** - Use a strong, randomly generated key
3. ✅ **Store keys in environment variables** - Never hardcode keys in source code
4. ✅ **Use different keys for different environments** - Dev, staging, and production should have different keys
5. ✅ **Rotate keys periodically** - Change encryption keys as part of security maintenance

## Migration from Non-Encrypted Passwords

The implementation is **backward compatible**:
- If a password fails to decrypt, the server assumes it was not encrypted (for existing users/APIs)
- New registrations will always use encryption
- Existing users will continue to work during the transition period

## Testing

To test the encryption:

1. Register a new user - password will be encrypted
2. Login with that user - password will be encrypted
3. Check browser Network tab - you should see an encrypted string instead of plain password
4. Password will still work correctly after encryption

## Troubleshooting

### "Invalid password" errors after enabling encryption

- Ensure the encryption key matches on both client and server
- Check environment variables are loaded correctly
- Verify `crypto-js` is installed in both client and server

### Passwords not encrypting

- Check browser console for encryption errors
- Verify `encryptPassword` function is being called
- Ensure `crypto-js` is installed: `npm install crypto-js`

### Passwords decrypting incorrectly

- Verify encryption keys match exactly on client and server
- Check for extra spaces or special characters in environment variables
- Ensure keys are at least 32 characters long

## Future Enhancements

Potential improvements for even stronger security:

1. **Public-Key Encryption**: Use RSA encryption where server has private key and client uses public key
2. **Key Rotation**: Implement automatic key rotation mechanism
3. **Key Exchange Protocol**: Implement a secure key exchange protocol for the encryption key
4. **Hardware Security Module (HSM)**: Use HSM for key storage in enterprise environments

