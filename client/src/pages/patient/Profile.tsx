import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService, authService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { GENDERS, GENDER_OPTIONS, BLOOD_GROUP_OPTIONS, TOAST_MESSAGES } from '../../constants';
import DatePickerComponent from '../../components/common/DatePicker';
import { format } from 'date-fns';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setValue('firstName', userData.firstName);
      setValue('lastName', userData.lastName);
      setValue('email', userData.email);
      setValue('phone', userData.phone);
      setValue('dateOfBirth', userData.dateOfBirth);
      setValue('gender', userData.gender);
      if (patientRes.data) {
        setValue('bloodGroup', patientRes.data.bloodGroup);
        setValue('allergies', patientRes.data.allergies?.join(', '));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await Promise.all([
        authService.updateProfile(data),
        patientService.updateProfile({
          bloodGroup: data.bloodGroup,
          allergies: data.allergies?.split(',').map((a: string) => a.trim()).filter(Boolean),
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
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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

        <button type="submit" className="btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
}

