import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService, authService, fileService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { GENDERS, GENDER_OPTIONS, BLOOD_GROUP_OPTIONS, TOAST_MESSAGES } from '../../constants';
import DatePickerComponent from '../../components/common/DatePicker';
import { format } from 'date-fns';
import { Camera, X, Upload, User } from 'lucide-react';
import { useLoader } from '../../context/LoaderContext';
import DiseaseCheckboxes from '../../components/common/DiseaseCheckboxes';
import BMICalculator from '../../components/common/BMICalculator';
import { CommonDiseaseId } from '../../constants/diseases';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<CommonDiseaseId[]>([]);
  const [height, setHeight] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);

  const { register, handleSubmit, setValue, watch } = useForm();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [userRes, patientRes] = await Promise.all([
        authService.getMe(),
        patientService.getProfile(),
      ]);
      setProfile(patientRes.data);
      const userData = userRes.data.user;
      setProfileImage(userData.profileImage || '');
      setValue('firstName', userData.firstName);
      setValue('lastName', userData.lastName);
      setValue('email', userData.email);
      setValue('phone', userData.phone);
      setValue('dateOfBirth', userData.dateOfBirth);
      setValue('gender', userData.gender);
      if (patientRes.data) {
        setValue('bloodGroup', patientRes.data.bloodGroup);
        setValue('allergies', patientRes.data.allergies?.join(', '));
        
        // Set height and weight
        if (patientRes.data.height) setHeight(patientRes.data.height);
        if (patientRes.data.weight) setWeight(patientRes.data.weight);
        
        // Set selected diseases from chronicConditions
        if (patientRes.data.chronicConditions && Array.isArray(patientRes.data.chronicConditions)) {
          const diseaseIds = patientRes.data.chronicConditions
            .map((condition: any) => condition.condition?.toLowerCase().replace(/\s+/g, '_'))
            .filter((id: string) => id) as CommonDiseaseId[];
          setSelectedDiseases(diseaseIds);
        }
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
        relatedEntityType: 'profile-image',
        relatedEntityId: user?.id,
        isPublic: 'true'
      });

      const imageUrl = uploadResponse.data.file.fileUrl;

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

  const onSubmit = async (data: any) => {
    try {
      // Calculate BMI if height and weight are provided
      let calculatedBMI = 0;
      if (height > 0 && weight > 0) {
        const heightInMeters = height / 100;
        calculatedBMI = weight / (heightInMeters * heightInMeters);
      }

      // Convert selected diseases to chronicConditions format
      const chronicConditions = selectedDiseases.map((diseaseId) => ({
        condition: diseaseId,
        diagnosisDate: new Date(),
        severity: 'moderate' as const,
      }));

      await Promise.all([
        authService.updateProfile(data),
        patientService.updateProfile({
          bloodGroup: data.bloodGroup,
          allergies: data.allergies?.split(',').map((a: string) => a.trim()).filter(Boolean),
          height: height > 0 ? height : undefined,
          weight: weight > 0 ? weight : undefined,
          bmi: calculatedBMI > 0 ? parseFloat(calculatedBMI.toFixed(1)) : undefined,
          chronicConditions: chronicConditions,
        }),
      ]);
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
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input {...register('firstName')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input {...register('lastName')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input {...register('email')} type="email" className="input-field" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input {...register('phone')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <DatePickerComponent
                selected={watch('dateOfBirth') ? new Date(watch('dateOfBirth')) : null}
                onChange={(date) => {
                  if (date) {
                    setValue('dateOfBirth', format(date, 'yyyy-MM-dd'));
                  } else {
                    setValue('dateOfBirth', '');
                  }
                }}
                placeholderText="Select date of birth"
                dateFormat="MM/dd/yyyy"
                maxDate={new Date()}
                className="input-field"
              />
              <input type="hidden" {...register('dateOfBirth')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select {...register('gender')} className="input-field">
                <option value="">Select</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Medical Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <select {...register('bloodGroup')} className="input-field">
                <option value="">Select</option>
                {BLOOD_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergies (comma separated)</label>
              <input {...register('allergies')} className="input-field" placeholder="Peanuts, Penicillin, etc." />
            </div>
          </div>
        </div>

        {/* BMI Calculator */}
        <div className="card">
          <BMICalculator
            height={height}
            weight={weight}
            onHeightChange={setHeight}
            onWeightChange={setWeight}
          />
        </div>

        {/* Common Diseases Checkboxes */}
        <div className="card">
          <DiseaseCheckboxes
            selectedDiseases={selectedDiseases}
            onChange={setSelectedDiseases}
          />
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

