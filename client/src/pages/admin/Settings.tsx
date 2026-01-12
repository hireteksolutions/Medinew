import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  Mail,
  Users,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  Bell,
  Coins,
  Plus,
  Edit,
  Trash2,
  X,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api';
import { TOAST_MESSAGES } from '../../constants';

interface SystemSettings {
  appointmentSlotDuration?: number;
  advanceBookingDays?: number;
  cancellationHours?: number;
  minConsultationFee?: number;
  maxConsultationFee?: number;
  systemName?: string;
  systemEmail?: string;
  enableNotifications?: boolean;
  enableSMS?: boolean;
  enableEmail?: boolean;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
}

interface EmailTemplate {
  _id?: string;
  name: string;
  subject: string;
  body: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  variables?: string[];
}

interface Specialization {
  _id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface Role {
  _id?: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isActive?: boolean;
  isSystem?: boolean;
}

interface Permission {
  key: string;
  value: string;
  label: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    appointmentSlotDuration: 30,
    advanceBookingDays: 30,
    cancellationHours: 24,
    minConsultationFee: 100,
    maxConsultationFee: 5000,
    systemName: 'MediNew',
    systemEmail: 'admin@medinew.com',
    enableNotifications: true,
    enableSMS: false,
    enableEmail: true,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
  });
  
  // Email Templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState<EmailTemplate>({
    name: '',
    subject: '',
    body: '',
    description: '',
    category: 'system',
    isActive: true,
    variables: []
  });
  
  // Specializations state
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);
  const [showSpecializationModal, setShowSpecializationModal] = useState(false);
  const [specializationForm, setSpecializationForm] = useState<Specialization>({
    name: '',
    description: '',
    isActive: true
  });
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState<Role>({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    isActive: true,
    isSystem: false
  });

  useEffect(() => {
    loadSettings();
    if (activeTab === 'email') loadEmailTemplates();
    if (activeTab === 'specialties') loadSpecializations();
    if (activeTab === 'roles') {
      loadRoles();
      loadPermissions();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSettings();
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.SETTINGS_SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const response = await adminService.getEmailTemplates();
      setEmailTemplates(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOADING_EMAIL_TEMPLATES_FAILED);
    }
  };

  const loadSpecializations = async () => {
    try {
      const response = await adminService.getSpecializations();
      setSpecializations(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOADING_SPECIALIZATIONS_FAILED);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await adminService.getRoles();
      setRoles(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOADING_ROLES_FAILED);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await adminService.getPermissions();
      setPermissions(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOADING_PERMISSIONS_FAILED);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminService.updateSettings(settings);
      toast.success(TOAST_MESSAGES.SETTINGS_SAVED_SUCCESS);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.SETTINGS_SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEmailTemplate = async () => {
    try {
      if (selectedTemplate?._id) {
        await adminService.updateEmailTemplate(selectedTemplate._id, templateForm);
        toast.success('Email template updated successfully');
      } else {
        await adminService.createEmailTemplate(templateForm);
        toast.success('Email template created successfully');
      }
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', subject: '', body: '', description: '', category: 'system', isActive: true, variables: [] });
      loadEmailTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.SAVING_EMAIL_TEMPLATE_FAILED);
    }
  };

  const handleEditEmailTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({ ...template });
    setShowTemplateModal(true);
  };

  const handleDeleteEmailTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return;
    try {
      await adminService.deleteEmailTemplate(id);
      toast.success(TOAST_MESSAGES.EMAIL_TEMPLATE_DELETED_SUCCESS);
      loadEmailTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.DELETING_EMAIL_TEMPLATE_FAILED);
    }
  };

  const handleSaveSpecialization = async () => {
    try {
      if (selectedSpecialization?._id) {
        await adminService.updateSpecialization(selectedSpecialization._id, specializationForm);
        toast.success(TOAST_MESSAGES.SPECIALIZATION_UPDATED_SUCCESS);
      } else {
        await adminService.createSpecialization(specializationForm);
        toast.success(TOAST_MESSAGES.SPECIALIZATION_CREATED_SUCCESS);
      }
      setShowSpecializationModal(false);
      setSelectedSpecialization(null);
      setSpecializationForm({ name: '', description: '', isActive: true });
      loadSpecializations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.SAVING_SPECIALIZATION_FAILED);
    }
  };

  const handleEditSpecialization = (spec: Specialization) => {
    setSelectedSpecialization(spec);
    setSpecializationForm({ ...spec });
    setShowSpecializationModal(true);
  };

  const handleDeleteSpecialization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this specialization?')) return;
    try {
      await adminService.deleteSpecialization(id);
      toast.success(TOAST_MESSAGES.SPECIALIZATION_DELETED_SUCCESS);
      loadSpecializations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.DELETING_SPECIALIZATION_FAILED);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (!roleForm.name.trim() || !roleForm.displayName.trim()) {
        toast.error(TOAST_MESSAGES.NAME_AND_DISPLAY_NAME_REQUIRED);
        return;
      }
      
      if (selectedRole?._id) {
        await adminService.updateRole(selectedRole._id, roleForm);
        toast.success(TOAST_MESSAGES.ROLE_UPDATED_SUCCESS);
      } else {
        await adminService.createRole(roleForm);
        toast.success(TOAST_MESSAGES.ROLE_CREATED_SUCCESS);
      }
      setShowRoleModal(false);
      setSelectedRole(null);
      setRoleForm({ name: '', displayName: '', description: '', permissions: [], isActive: true, isSystem: false });
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.SAVING_ROLE_FAILED);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({ ...role });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? Users assigned to this role will lose access.')) return;
    try {
      await adminService.deleteRole(id);
      toast.success(TOAST_MESSAGES.ROLE_DELETED_SUCCESS);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.DELETING_ROLE_FAILED);
    }
  };

  const togglePermission = (permissionValue: string) => {
    setRoleForm((prev) => {
      const permissions = prev.permissions || [];
      if (permissions.includes(permissionValue)) {
        return { ...prev, permissions: permissions.filter((p) => p !== permissionValue) };
      } else {
        return { ...prev, permissions: [...permissions, permissionValue] };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General Settings', icon: SettingsIcon },
    { id: 'appointments', label: 'Appointments', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'specialties', label: 'Specialties', icon: Users },
    { id: 'pricing', label: 'Pricing', icon: Coins },
    { id: 'roles', label: 'Role Management', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings & Configuration</h1>
          <p className="text-gray-600 mt-1">Manage system settings and configurations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">General System Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Name
                    </label>
                    <input
                      type="text"
                      value={settings.systemName}
                      onChange={(e) => handleChange('systemName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Email
                    </label>
                    <input
                      type="email"
                      value={settings.systemEmail}
                      onChange={(e) => handleChange('systemEmail', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Settings */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Appointment Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Appointment Slot Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      step="15"
                      value={settings.appointmentSlotDuration || 30}
                      onChange={(e) => handleChange('appointmentSlotDuration', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Default duration for appointment slots (15, 30, 45, 60, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Booking Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.advanceBookingDays || 30}
                      onChange={(e) => handleChange('advanceBookingDays', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum days in advance patients can book appointments
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Hours Before Appointment
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.cancellationHours || 24}
                      onChange={(e) => handleChange('cancellationHours', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Minimum hours before appointment when cancellation is allowed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
                      <p className="text-sm text-gray-500">Enable system-wide notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableNotifications}
                        onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
                      <p className="text-sm text-gray-500">Send email notifications to users</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableEmail}
                        onChange={(e) => handleChange('enableEmail', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable SMS Notifications</label>
                      <p className="text-sm text-gray-500">Send SMS notifications to users</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableSMS}
                        onChange={(e) => handleChange('enableSMS', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Templates */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Email Templates</h3>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setTemplateForm({ name: '', subject: '', body: '', description: '', category: 'system', isActive: true, variables: [] });
                    setShowTemplateModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Template
                </button>
              </div>
              <div className="space-y-4">
                {emailTemplates.length === 0 ? (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No email templates found</p>
                  </div>
                ) : (
                  emailTemplates.map((template) => (
                    <div key={template._id} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-500">{template.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditEmailTemplate(template)}
                            className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => template._id && handleDeleteEmailTemplate(template._id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{template.category}</span>
                        {template.isActive ? (
                          <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                        ) : (
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Inactive</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Specialties Management */}
          {activeTab === 'specialties' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manage Specialties</h3>
                <button
                  onClick={() => {
                    setSelectedSpecialization(null);
                    setSpecializationForm({ name: '', description: '', isActive: true });
                    setShowSpecializationModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Specialization
                </button>
              </div>
              <div className="space-y-4">
                {specializations.length === 0 ? (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No specializations found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {specializations.map((spec) => (
                          <tr key={spec._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{spec.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{spec.description || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {spec.isActive ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditSpecialization(spec)}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => spec._id && handleDeleteSpecialization(spec._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Settings */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Consultation Fee Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.minConsultationFee || 100}
                      onChange={(e) => handleChange('minConsultationFee', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.maxConsultationFee || 5000}
                      onChange={(e) => handleChange('maxConsultationFee', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      These values set the allowed range for doctor consultation fees. 
                      Doctors can set their fees within this range when creating or updating their profiles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Management */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manage Roles & Permissions</h3>
                <button
                  onClick={() => {
                    setSelectedRole(null);
                    setRoleForm({ name: '', displayName: '', description: '', permissions: [], isActive: true, isSystem: false });
                    setShowRoleModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Role
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Role Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Display Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No roles found. Create a new role to get started.
                        </td>
                      </tr>
                    ) : (
                      roles.map((role) => (
                        <tr key={role._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{role.displayName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {role.permissions?.length || 0} permission(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                role.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {role.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                role.isSystem
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {role.isSystem ? 'System' : 'Custom'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditRole(role)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!role.isSystem && (
                                <button
                                  onClick={() => role._id && handleDeleteRole(role._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Backup */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            System Backup & Restore
          </h3>
          <div className="space-y-4">
            <button className="btn-secondary w-full">Create Backup</button>
            <button className="btn-secondary w-full">Restore from Backup</button>
            <p className="text-sm text-gray-500">
              Create manual backups or restore from previous backups
            </p>
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Legal Documents
          </h3>
          <div className="space-y-4">
            <button className="btn-secondary w-full">Manage Terms of Service</button>
            <button className="btn-secondary w-full">Manage Privacy Policy</button>
            <p className="text-sm text-gray-500">
              Update terms of service and privacy policy documents
            </p>
          </div>
        </div>
      </div>

      {/* Email Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedTemplate ? 'Edit' : 'Create'} Email Template</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Body *</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="appointment">Appointment</option>
                  <option value="auth">Authentication</option>
                  <option value="notification">Notification</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setShowTemplateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveEmailTemplate} className="btn-primary">
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specialization Modal */}
      {showSpecializationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedSpecialization ? 'Edit' : 'Create'} Specialization</h2>
              <button onClick={() => setShowSpecializationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={specializationForm.name}
                  onChange={(e) => setSpecializationForm({ ...specializationForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={specializationForm.description}
                  onChange={(e) => setSpecializationForm({ ...specializationForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={specializationForm.isActive}
                  onChange={(e) => setSpecializationForm({ ...specializationForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setShowSpecializationModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveSpecialization} className="btn-primary">
                  Save Specialization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold">{selectedRole ? 'Edit' : 'Create'} Role</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name (lowercase, no spaces) *
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., receptionist"
                    required
                    disabled={selectedRole?.isSystem}
                  />
                  <p className="text-xs text-gray-500 mt-1">Used internally, must be unique</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={roleForm.displayName}
                    onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Receptionist"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Human-readable name</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {permissions.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading permissions...</p>
                  ) : (
                    <div className="space-y-3">
                      {permissions.map((permission) => (
                        <label
                          key={permission.value}
                          className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={roleForm.permissions?.includes(permission.value) || false}
                            onChange={() => togglePermission(permission.value)}
                            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{permission.label}</div>
                            <div className="text-xs text-gray-500">{permission.value}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {roleForm.permissions?.length || 0} permission(s) selected
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={roleForm.isActive}
                  onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button onClick={() => setShowRoleModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveRole} className="btn-primary">
                  {selectedRole ? 'Update' : 'Create'} Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

