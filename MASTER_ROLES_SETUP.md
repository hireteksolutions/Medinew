# Master Roles System - Setup Guide

## Overview

The master roles system allows all roles to be stored in the database (`master_roles` collection) and validated dynamically from the database instead of hardcoded constants.

## Features

- ✅ Database-driven role management
- ✅ Role validation from database
- ✅ Caching for performance (5-minute TTL)
- ✅ Role permissions system
- ✅ System roles (protected from deletion)
- ✅ Role priority/ordering
- ✅ Complete CRUD API for roles

## Setup Instructions

### 1. Seed Initial Roles

Run the seed script to create default roles (patient, doctor, admin):

```bash
cd server
node scripts/seedMasterRoles.js
```

This will create three system roles:
- **Patient** (priority: 1)
- **Doctor** (priority: 2)
- **Admin** (priority: 3)

### 2. API Endpoints

#### Get Active Roles (Public)
```
GET /api/master-roles/active
```
Returns list of active roles (for dropdowns, registration forms, etc.)

#### Get All Roles (Admin Only)
```
GET /api/master-roles?isActive=true&page=1&limit=50
```

#### Get Role by ID (Admin Only)
```
GET /api/master-roles/:id
```

#### Create Role (Admin Only)
```
POST /api/master-roles
Body: {
  roleName: "nurse",
  displayName: "Nurse",
  description: "Nursing staff role",
  permissions: ["view_patients", "view_appointments"],
  priority: 2
}
```

#### Update Role (Admin Only)
```
PUT /api/master-roles/:id
Body: {
  displayName: "Updated Name",
  isActive: true,
  permissions: [...]
}
```

#### Delete Role (Admin Only)
```
DELETE /api/master-roles/:id
```
Note: Cannot delete system roles or roles in use by users

#### Get Role Statistics (Admin Only)
```
GET /api/master-roles/stats
```

## Usage Examples

### Validating Roles in Routes

#### Option 1: Using validateRoleFromDB Middleware

```javascript
import { validateRoleFromDB } from '../middleware/validateRole.js';

router.post('/register', validateRoleFromDB, register);
```

#### Option 2: Using Custom Validation in Controller

```javascript
import { isValidRoleName, getRoleByName } from '../utils/roleHelper.js';

// In controller
const { role } = req.body;
const isValid = await isValidRoleName(role);
if (!isValid) {
  return res.status(400).json({ message: 'Invalid role' });
}

// Get full role details
const roleData = await getRoleByName(role);
```

#### Option 3: Dynamic Validation for express-validator

```javascript
import { getRoleValidationValues } from '../middleware/validateRole.js';
import { body, custom } from 'express-validator';

// Create dynamic validation
const roleNames = await getRoleValidationValues();

const registerValidation = [
  body('email').isEmail(),
  body('role').isIn(roleNames), // Dynamic from database
  // ... other validations
];
```

### Using Role Helper Functions

```javascript
import {
  getActiveRoles,
  getRoleById,
  getRoleByName,
  getRoleNames,
  isValidRoleId,
  isValidRoleName,
  getDefaultRole
} from '../utils/roleHelper.js';

// Get all active roles
const roles = await getActiveRoles();

// Validate role ID
const isValid = await isValidRoleId(roleId);

// Get role by name
const role = await getRoleByName('patient');

// Get default role
const defaultRole = await getDefaultRole();
```

## Migration from String-Based Roles

### Current State
- User model uses `role` field as String
- Roles validated from constants (USER_ROLE_VALUES)

### Recommended Migration Path

#### Option 1: Keep Both (Backward Compatible)
1. Keep `role` field as String (for backward compatibility)
2. Add `roleId` field as reference to MasterRole
3. Use roleId for new operations
4. Gradually migrate existing users

#### Option 2: Full Migration
1. Add `roleId` field to User model
2. Create migration script to populate roleId from role string
3. Update all code to use roleId
4. Remove role field after migration

Example User model update:

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields
  role: {
    type: String,
    enum: USER_ROLE_VALUES, // Keep for backward compatibility
    required: true,
    default: DEFAULT_USER_ROLE
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterRole',
    index: true
  },
  // ... rest of schema
});

// Populate roleId based on role name
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.roleId) {
    const { getRoleByName } = await import('../utils/roleHelper.js');
    const role = await getRoleByName(this.role);
    if (role) {
      this.roleId = role._id;
    }
  }
  next();
});
```

## Client-Side Integration

### Fetching Active Roles for Dropdown

```typescript
import { masterRoleService } from '../services/api';

// In component
const fetchRoles = async () => {
  try {
    const response = await masterRoleService.getActive();
    setRoles(response.data.data);
  } catch (error) {
    console.error('Error fetching roles:', error);
  }
};
```

### Using in Registration Form

```typescript
// Fetch roles on component mount
useEffect(() => {
  fetchRoles();
}, []);

// Use in form
<select name="roleId">
  {roles.map(role => (
    <option key={role._id} value={role._id}>
      {role.displayName}
    </option>
  ))}
</select>
```

## Caching

Roles are cached for 5 minutes to improve performance. Cache is automatically cleared when:
- New role is created
- Role is updated
- Role is deleted

To manually clear cache:
```javascript
import { clearRoleCache } from '../utils/roleHelper.js';
clearRoleCache();
```

## Security Considerations

1. **System Roles**: Cannot be deleted or have their roleName changed
2. **Role in Use**: Cannot delete roles that are assigned to users
3. **Admin Only**: Most role management operations require admin privileges
4. **Active Roles**: Only active roles are returned in public endpoints

## Best Practices

1. Always validate roles from database when accepting user input
2. Use cached role helper functions for better performance
3. Check `isActive` flag before assigning roles
4. Use roleId for new implementations (more reliable than role names)
5. Keep system roles protected (don't modify isSystem flag)

## Troubleshooting

### Roles not appearing
- Check if roles are seeded: `node scripts/seedMasterRoles.js`
- Verify `isActive: true` in database
- Clear cache: `clearRoleCache()`

### Validation failing
- Ensure role exists in database
- Check role is active
- Verify roleName matches exactly (case-insensitive)

### Permission denied
- Verify user has admin role
- Check if route uses `authorize(USER_ROLES.ADMIN)`

