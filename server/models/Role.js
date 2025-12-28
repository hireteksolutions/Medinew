import mongoose from 'mongoose';

// Define available permissions/modules
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  
  // Doctors
  DOCTORS_VIEW: 'doctors:view',
  DOCTORS_CREATE: 'doctors:create',
  DOCTORS_EDIT: 'doctors:edit',
  DOCTORS_DELETE: 'doctors:delete',
  DOCTORS_APPROVE: 'doctors:approve',
  
  // Patients
  PATIENTS_VIEW: 'patients:view',
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_EDIT: 'patients:edit',
  PATIENTS_DELETE: 'patients:delete',
  
  // Appointments
  APPOINTMENTS_VIEW: 'appointments:view',
  APPOINTMENTS_CREATE: 'appointments:create',
  APPOINTMENTS_EDIT: 'appointments:edit',
  APPOINTMENTS_CANCEL: 'appointments:cancel',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  
  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  // Roles
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_EDIT: 'roles:edit',
  ROLES_DELETE: 'roles:delete',
  
  // Specialties
  SPECIALTIES_VIEW: 'specialties:view',
  SPECIALTIES_CREATE: 'specialties:create',
  SPECIALTIES_EDIT: 'specialties:edit',
  SPECIALTIES_DELETE: 'specialties:delete',
};

export const PERMISSION_VALUES = Object.values(PERMISSIONS);

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    enum: PERMISSION_VALUES
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

roleSchema.index({ name: 1 }, { unique: true });
roleSchema.index({ isActive: 1 });

// Prevent deletion of system roles
roleSchema.pre('deleteOne', { document: true, query: false }, async function() {
  if (this.isSystem) {
    throw new Error('Cannot delete system roles');
  }
});

export default mongoose.model('Role', roleSchema);

