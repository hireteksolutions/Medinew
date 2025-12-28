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
  Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemSettings {
  appointmentSlotDuration: number;
  minConsultationFee: number;
  maxConsultationFee: number;
  systemName: string;
  systemEmail: string;
  enableNotifications: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    appointmentSlotDuration: 30,
    minConsultationFee: 100,
    maxConsultationFee: 5000,
    systemName: 'MediNew',
    systemEmail: 'admin@medinew.com',
    enableNotifications: true,
    enableSMS: false,
    enableEmail: true,
  });

  useEffect(() => {
    // Load settings from backend or use defaults
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Fetch from backend API
      // const response = await adminService.getSettings();
      // setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Save to backend API
      // await adminService.updateSettings(settings);
      toast.success(TOAST_MESSAGES.SETTINGS_SAVED_SUCCESS);
    } catch (error) {
      toast.error(TOAST_MESSAGES.SETTINGS_SAVE_FAILED);
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
                      value={settings.appointmentSlotDuration}
                      onChange={(e) => handleChange('appointmentSlotDuration', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Default duration for appointment slots (15, 30, 45, 60, etc.)
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
              <div>
                <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Appointment Confirmation</h4>
                      <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Email sent when an appointment is confirmed
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Appointment Reminder</h4>
                      <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Email sent 24 hours before appointment
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Password Reset</h4>
                      <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Email sent for password reset requests
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specialties Management */}
          {activeTab === 'specialties' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Manage Specialties</h3>
                <p className="text-gray-600 mb-4">
                  Specialties are managed through the Specializations collection in the database.
                  Use the seed script to add or update specializations.
                </p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Note</h4>
                      <p className="text-sm text-blue-700">
                        To add or update specialties, run the seed script:
                        <code className="block mt-2 bg-blue-100 p-2 rounded">
                          npm run seed:specializations
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
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
                      value={settings.minConsultationFee}
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
                      value={settings.maxConsultationFee}
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
    </div>
  );
}

