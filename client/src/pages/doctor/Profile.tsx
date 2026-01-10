import { useState, useEffect } from 'react';
import { doctorDashboardService, specializationService, authService, fileService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FORM_LIMITS, TOAST_MESSAGES } from '../../constants';
import { Camera, X, Upload, User, Plus, Trash2 } from 'lucide-react';
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
  const [educationEntries, setEducationEntries] = useState<any[]>([{ degree: '', institution: '', year: '' }]);

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
      const userData = userRes.data?.user;
      setProfileImage(userData?.profileImage || '');
      
      // Set doctor fields
      setValue('specialization', profileRes.data.specialization);
      setValue('consultationFee', profileRes.data.consultationFee);
      setValue('experience', profileRes.data.experience);
      setValue('biography', profileRes.data.biography);
      setValue('consultationDuration', profileRes.data.consultationDuration);
      setValue('consultationType', profileRes.data.consultationType || ['both']);
      setValue('currentHospitalName', profileRes.data.currentHospitalName || '');
      const educationData = profileRes.data.education || [];
      // Ensure at least one empty education entry if none exist
      const entries = educationData.length > 0 ? educationData : [{ degree: '', institution: '', year: '' }];
      setEducationEntries(entries);
      entries.forEach((edu: any, index: number) => {
        setValue(`education.${index}.degree`, edu.degree || '');
        setValue(`education.${index}.institution`, edu.institution || '');
        setValue(`education.${index}.year`, edu.year || '');
      });
      
      // Set address fields
      if (userData?.address) {
        setValue('address.street', userData.address.street || '');
        setValue('address.city', userData.address.city || '');
        setValue('address.state', userData.address.state || '');
        setValue('address.zipCode', userData.address.zipCode || '');
        setValue('address.latitude', userData.address.latitude || '');
        setValue('address.longitude', userData.address.longitude || '');
      }
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

    // Validate file size (max 10MB - configurable, matches backend)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`Image size should be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    try {
      setUploadingImage(true);
      showLoader('Uploading profile photo...');

      // Upload file
      const uploadResponse = await fileService.upload(file, {
        relatedEntityType: 'profile-image',
        relatedEntityId: user?.id,
        isPublic: 'true'
      });

      // Use signedUrl if available (for private buckets), otherwise use fileUrl (for public buckets)
      const fileData = uploadResponse.data.file;
      const imageUrl = fileData.signedUrl || fileData.fileUrl || fileData.publicUrl;

      // Update profile with new image URL
      await authService.updateProfile({ profileImage: imageUrl });
      
      setProfileImage(imageUrl);
      if (user) {
        updateUser({ ...user, profileImage: imageUrl });
      }
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

  const addEducationEntry = () => {
    const newEntry = { degree: '', institution: '', year: '' };
    const updatedEntries = [...educationEntries, newEntry];
    setEducationEntries(updatedEntries);
    const index = updatedEntries.length - 1;
    setValue(`education.${index}.degree`, '');
    setValue(`education.${index}.institution`, '');
    setValue(`education.${index}.year`, '');
  };

  const removeEducationEntry = (index: number) => {
    const updatedEntries = educationEntries.filter((_, i) => i !== index);
    setEducationEntries(updatedEntries);
    // Clear the form values for this entry
    setValue(`education.${index}.degree`, undefined);
    setValue(`education.${index}.institution`, undefined);
    setValue(`education.${index}.year`, undefined);
  };

  const updateEducationEntry = (index: number, field: string, value: any) => {
    const updatedEntries = [...educationEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setEducationEntries(updatedEntries);
    setValue(`education.${index}.${field}`, value);
  };

  const onSubmit = async (data: any) => {
    try {
      // Separate address and consultationType from doctor profile data
      const { address, consultationType, ...doctorData } = data;
      
      // Process education entries - filter out empty entries
      const educationData = educationEntries
        .map((edu, index) => ({
          degree: data[`education.${index}.degree`] || edu.degree,
          institution: data[`education.${index}.institution`] || edu.institution,
          year: data[`education.${index}.year`] ? parseInt(data[`education.${index}.year`]) : edu.year
        }))
        .filter(edu => edu.degree || edu.institution);
      
      doctorData.education = educationData;
      
      // Prepare consultationType array
      let consultationTypeArray = ['both'];
      if (consultationType) {
        if (Array.isArray(consultationType)) {
          consultationTypeArray = consultationType.length > 0 ? consultationType : ['both'];
        } else {
          consultationTypeArray = [consultationType];
        }
      }
      
      // Update doctor profile
      await doctorDashboardService.updateProfile({
        ...doctorData,
        consultationType: consultationTypeArray
      });
      
      // Update user address if provided
      if (address && Object.keys(address).some(key => address[key] !== '' && address[key] !== null && address[key] !== undefined)) {
        // Clean up empty values
        const cleanAddress: any = {};
        if (address.street) cleanAddress.street = address.street;
        if (address.city) cleanAddress.city = address.city;
        if (address.state) cleanAddress.state = address.state;
        if (address.zipCode) cleanAddress.zipCode = address.zipCode;
        if (address.latitude) cleanAddress.latitude = parseFloat(address.latitude);
        if (address.longitude) cleanAddress.longitude = parseFloat(address.longitude);
        
        if (Object.keys(cleanAddress).length > 0) {
          await authService.updateProfile({ address: cleanAddress });
        }
      }
      
      toast.success(TOAST_MESSAGES.PROFILE_UPDATED_SUCCESS);
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || TOAST_MESSAGES.PROFILE_UPDATE_FAILED);
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
                      if (user) {
                        updateUser({ ...user, profileImage: '' });
                      }
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
                  max: FORM_LIMITS.EXPERIENCE_MAX
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Hospital Name</label>
              <input
                {...register('currentHospitalName')}
                type="text"
                className="input-field"
                placeholder="Enter current hospital/clinic name"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
            <div className="space-y-3">
              {educationEntries.map((edu, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-gray-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Degree</label>
                    <input
                      {...register(`education.${index}.degree`)}
                      type="text"
                      className="input-field"
                      placeholder="e.g., MBBS, MD"
                      value={edu.degree || ''}
                      onChange={(e) => updateEducationEntry(index, 'degree', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Institution</label>
                    <input
                      {...register(`education.${index}.institution`)}
                      type="text"
                      className="input-field"
                      placeholder="University/College name"
                      value={edu.institution || ''}
                      onChange={(e) => updateEducationEntry(index, 'institution', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                      <input
                        {...register(`education.${index}.year`)}
                        type="number"
                        className="input-field"
                        placeholder="Year"
                        value={edu.year || ''}
                        onChange={(e) => updateEducationEntry(index, 'year', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEducationEntry(index)}
                      disabled={educationEntries.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addEducationEntry}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Education Entry
              </button>
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

        {/* Location Information Section */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold mb-4">Location Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                {...register('address.street')}
                type="text"
                className="input-field"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                {...register('address.city')}
                type="text"
                className="input-field"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                {...register('address.state')}
                type="text"
                className="input-field"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <input
                {...register('address.zipCode')}
                type="text"
                className="input-field"
                placeholder="ZIP Code"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude (optional - for GPS search)
              </label>
              <input
                {...register('address.latitude', {
                  valueAsNumber: true
                })}
                type="number"
                step="any"
                className="input-field"
                placeholder="e.g., 28.6139"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty to auto-detect from address</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude (optional - for GPS search)
              </label>
              <input
                {...register('address.longitude', {
                  valueAsNumber: true
                })}
                type="number"
                step="any"
                className="input-field"
                placeholder="e.g., 77.2090"
              />
            </div>
          </div>
        </div>

        {/* Consultation Type Section */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Consultation Type</h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('consultationType')}
                value="online"
                className="mr-2 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-gray-700">Online Consultations</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('consultationType')}
                value="offline"
                className="mr-2 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-gray-700">Offline Consultations</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">Select at least one consultation type. Patients will see this when searching for doctors.</p>
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

