import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { USER_ROLES, USER_ROLE_VALUES, GENDERS, GENDER_VALUES, DEFAULT_USER_ROLE } from '../constants/index.js';
import { VALIDATION_MESSAGES } from '../constants/messages.js';
import { CRYPTO } from '../constants/numeric.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_EMAIL],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, VALIDATION_MESSAGES.PROVIDE_VALID_EMAIL]
  },
  password: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_PASSWORD],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: USER_ROLE_VALUES,
    required: true,
    default: DEFAULT_USER_ROLE
  },
  customRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  firstName: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_FIRST_NAME],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_LAST_NAME],
    trim: true
  },
  phone: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_PHONE_NUMBER],
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: GENDER_VALUES
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(CRYPTO.BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Indexes for better query performance
// Note: email already has unique index from unique: true
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT access token (short-lived)
userSchema.methods.generateToken = async function() {
  const jwtSecret = String(process.env.JWT_SECRET || 'fallback_secret');
  const expiresIn = String(process.env.JWT_EXPIRE || '7d');
  
  try {
    const { getAccessTokenExpiration } = await import('../services/adminSettingsService.js');
    const tokenExpiresIn = await getAccessTokenExpiration();
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: String(tokenExpiresIn || expiresIn)
    });
  } catch (error) {
    // Fallback if adminSettingsService fails or AdminSettings model doesn't exist
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: expiresIn
    });
  }
};

// Generate JWT access token (short-lived, e.g., 15 minutes)
userSchema.methods.generateAccessToken = async function() {
  const jwtSecret = String(process.env.JWT_SECRET || 'fallback_secret');
  const defaultExpiresIn = String(process.env.JWT_ACCESS_EXPIRE || '15m');
  
  try {
    const { getAccessTokenExpiration } = await import('../services/adminSettingsService.js');
    const expiresIn = await getAccessTokenExpiration();
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: String(expiresIn || defaultExpiresIn)
    });
  } catch (error) {
    // Fallback if adminSettingsService fails or AdminSettings model doesn't exist
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: defaultExpiresIn
    });
  }
};

// Generate refresh token (long-lived, e.g., 30 days)
userSchema.methods.generateRefreshToken = async function() {
  const jwtSecret = String(process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_secret');
  const defaultExpiresIn = String(process.env.JWT_REFRESH_EXPIRE || '30d');
  
  try {
    const { getRefreshTokenExpiration } = await import('../services/adminSettingsService.js');
    const expiresIn = await getRefreshTokenExpiration();
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: String(expiresIn || defaultExpiresIn)
    });
  } catch (error) {
    // Fallback if adminSettingsService fails or AdminSettings model doesn't exist
    return jwt.sign({ id: String(this._id) }, jwtSecret, {
      expiresIn: defaultExpiresIn
    });
  }
};

export default mongoose.model('User', userSchema);

