import { useState, useEffect } from 'react';
import { doctorDashboardService, specializationService, authService, fileService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FORM_LIMITS, TOAST_MESSAGES } from '../../constants';
import { Camera, X, Upload, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../context/LoaderContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);
  const [profileImage, setProfileImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm();
  
  const watchedBiography = watch('biography', '');

  useEffect(() => {
    fetchProfile();
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      const response = await specializationService.getAll();
      const specializationsList = Array.isArray(response.data) ? response.data : [];
      setSpecializations(specializationsList);
    } catch (error) {
      console.error('Error fetching specializations:', error);
      setSpecializations([]);
    } finally {
      setLoadingSpecializations(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const [profileRes, userRes] = await Promise.all([
        doctorDashboardService.getProfile(),
        authService.getMe(),
      ]);
      setProfile(profileRes.data);
      const userData = userRes.data.user;
      setProfileImage(userData.profileImage || '');
      setValue('specialization', profileRes.data.specialization);
      setValue('consultationFee', profileRes.data.consultationFee);
      setValue('experience', profileRes.data.experience);
      setValue('biography', profileRes.data.biography);
      setValue('consultationDuration', profileRes.data.consultationDuration);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      showLoader('Uploading profile photo...');

      // Upload file
      const uploadResponse = await fileService.upload(file, {
        relatedEntityType: 'user',
        relatedEntityId: user?._id,
        isPublic: 'true'
      });

      const imageUrl = uploadResponse.data.file.fileUrl;

      // Update profile with new image URL
      await authService.updateProfile({ profileImage: imageUrl });
      
      setProfileImage(imageUrl);
      updateUser({ ...user, profileImage: imageUrl });
      toast.success('Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploadingImage(false);
      hideLoader();
      // Reset file input
      e.target.value = '';
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await doctorDashboardService.updateProfile(data);
      toast.success(TOAST_MESSAGES.PROFILE_UPDATED_SUCCESS);
      fetchProfile();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PROFILE_UPDATE_FAILED);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Photo Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profileImage ? (
                <div className="relative group">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all cursor-pointer">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary-200 shadow-lg">
                  {user?.firstName?.[0] || <User className="w-12 h-12" />}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer shadow-md hover:shadow-lg">
                <Upload className="w-4 h-4" />
                <span className="font-medium">{uploadingImage ? 'Uploading...' : profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              {profileImage && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authService.updateProfile({ profileImage: '' });
                      setProfileImage('');
                      updateUser({ ...user, profileImage: '' });
                      toast.success('Profile photo removed');
                    } catch (error) {
                      toast.error('Failed to remove profile photo');
                    }
                  }}
                  className="ml-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Remove</span>
                </button>
              )}
              <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 5MB</p>
            </div>
          </div>
        </div>

        <div className="card space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Professional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
              <select
                {...register('specialization')}
                className="input-field"
                disabled={loadingSpecializations}
              >
                <option value="">Select Specialization</option>
                {specializations.map((spec) => (
                  <option key={spec._id} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years)</label>
              <input
                {...register('experience', {
                  min: 0,
                  max: FORM_LIMITS.EXPERIENCE_MAX,
                  step: 0.1
                })}
                type="number"
                step="0.1"
                min="0"
                max={FORM_LIMITS.EXPERIENCE_MAX}
                maxLength={FORM_LIMITS.EXPERIENCE_MAX_DIGITS}
                className="input-field"
                placeholder="e.g., 5.5"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = target.value;
                  // Limit to max digits
                  if (value.length > FORM_LIMITS.EXPERIENCE_MAX_DIGITS) {
                    target.value = value.slice(0, FORM_LIMITS.EXPERIENCE_MAX_DIGITS);
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500">Max: {FORM_LIMITS.EXPERIENCE_MAX} years (can be fractional, max {FORM_LIMITS.EXPERIENCE_MAX_DIGITS} digits)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Fee (₹)</label>
              <input
                {...register('consultationFee', {
                  min: 0,
                  max: FORM_LIMITS.CONSULTATION_FEE_MAX
                })}
                type="number"
                min="0"
                max={FORM_LIMITS.CONSULTATION_FEE_MAX}
                maxLength={FORM_LIMITS.CONSULTATION_FEE_MAX_DIGITS}
                className="input-field"
                placeholder="Enter amount in ₹"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = target.value;
                  // Limit to max digits
                  if (value.length > FORM_LIMITS.CONSULTATION_FEE_MAX_DIGITS) {
                    target.value = value.slice(0, FORM_LIMITS.CONSULTATION_FEE_MAX_DIGITS);
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500">Max: ₹{FORM_LIMITS.CONSULTATION_FEE_MAX.toLocaleString()} (max {FORM_LIMITS.CONSULTATION_FEE_MAX_DIGITS} digits)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Duration (minutes)</label>
              <input
                {...register('consultationDuration', {
                  min: FORM_LIMITS.CONSULTATION_DURATION_MIN,
                  max: FORM_LIMITS.CONSULTATION_DURATION_MAX
                })}
                type="number"
                min={FORM_LIMITS.CONSULTATION_DURATION_MIN}
                max={FORM_LIMITS.CONSULTATION_DURATION_MAX}
                maxLength={FORM_LIMITS.CONSULTATION_DURATION_MAX_DIGITS}
                className="input-field"
                placeholder="e.g., 30"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = target.value;
                  // Limit to max digits
                  if (value.length > FORM_LIMITS.CONSULTATION_DURATION_MAX_DIGITS) {
                    target.value = value.slice(0, FORM_LIMITS.CONSULTATION_DURATION_MAX_DIGITS);
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500">Range: {FORM_LIMITS.CONSULTATION_DURATION_MIN}-{FORM_LIMITS.CONSULTATION_DURATION_MAX} minutes (max {FORM_LIMITS.CONSULTATION_DURATION_MAX_DIGITS} digits)</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Biography
              <span className="ml-2 text-xs text-gray-500">
                ({watchedBiography?.length || 0}/1000 characters)
              </span>
            </label>
            <textarea
              {...register('biography', {
                maxLength: 1000
              })}
              rows={4}
              maxLength={1000}
              className="input-field"
              placeholder="Tell us about your professional background..."
            />
            <p className="mt-1 text-xs text-gray-500">Max: 1000 characters</p>
          </div>
          </div>
        </div>

        <div className="card">
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

