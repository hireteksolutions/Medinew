import { useState, useEffect } from 'react';
import { doctorDashboardService, specializationService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FORM_LIMITS, TOAST_MESSAGES } from '../../constants';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);

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
      const response = await doctorDashboardService.getProfile();
      setProfile(response.data);
      setValue('specialization', response.data.specialization);
      setValue('consultationFee', response.data.consultationFee);
      setValue('experience', response.data.experience);
      setValue('biography', response.data.biography);
      setValue('consultationDuration', response.data.consultationDuration);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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

        <button type="submit" className="btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
}

