import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import MasterRole from '../models/MasterRole.js';

dotenv.config();

const seedRoles = async () => {
  try {
    await connectDB();

    const roles = [
      {
        roleName: 'patient',
        displayName: 'Patient',
        description: 'Regular patient user who can book appointments, view medical records, and communicate with doctors',
        permissions: [
          'view_appointments',
          'create_appointments',
          'cancel_appointments',
          'view_medical_records',
          'upload_medical_records',
          'view_doctors',
          'book_appointments',
          'send_messages',
          'view_notifications'
        ],
        isActive: true,
        isSystem: true,
        priority: 1
      },
      {
        roleName: 'doctor',
        displayName: 'Doctor',
        description: 'Healthcare provider who can manage appointments, patients, and provide medical consultations',
        permissions: [
          'view_appointments',
          'manage_appointments',
          'accept_appointments',
          'decline_appointments',
          'complete_appointments',
          'view_patients',
          'manage_schedule',
          'respond_to_messages',
          'view_medical_records',
          'manage_prescriptions',
          'view_reviews',
          'respond_to_reviews',
          'view_notifications'
        ],
        isActive: true,
        isSystem: true,
        priority: 2
      },
      {
        roleName: 'admin',
        displayName: 'Administrator',
        description: 'System administrator with full access to manage users, doctors, appointments, and system settings',
        permissions: [
          'manage_users',
          'manage_doctors',
          'approve_doctors',
          'reject_doctors',
          'suspend_users',
          'activate_users',
          'manage_appointments',
          'cancel_appointments',
          'view_reports',
          'manage_system_settings',
          'view_audit_logs',
          'manage_roles',
          'view_all_data'
        ],
        isActive: true,
        isSystem: true,
        priority: 3
      }
    ];

    console.log('Seeding master roles...');

    for (const roleData of roles) {
      const existingRole = await MasterRole.findOne({ roleName: roleData.roleName });

      if (existingRole) {
        console.log(`Role '${roleData.roleName}' already exists, updating...`);
        await MasterRole.findOneAndUpdate(
          { roleName: roleData.roleName },
          { ...roleData, updatedAt: new Date() },
          { new: true }
        );
        console.log(`✓ Updated role: ${roleData.displayName}`);
      } else {
        await MasterRole.create(roleData);
        console.log(`✓ Created role: ${roleData.displayName}`);
      }
    }

    console.log('\n✓ Master roles seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding master roles:', error);
    process.exit(1);
  }
};

seedRoles();

