import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { USER_ROLES, USER_ROLE_OPTIONS, GENDERS, GENDER_OPTIONS, UserRole, DASHBOARD_ROUTES } from '../../constants';
import { VALIDATION_MESSAGES, VALIDATION_PATTERNS, VALIDATION_RULES } from '../../constants/validation';
import { PROJECT_CONFIG } from '../../config';
import { authService, specializationService } from '../../services/api';
import { User, Mail, Phone, Lock, Calendar, UserCircle, CheckCircle, Eye, EyeOff, Award, X } from 'lucide-react';
import DatePickerComponent from '../../components/common/DatePicker';
import { format } from 'date-fns';
import { encryptPassword } from '../../utils/encryption';

// Create async validation functions
const checkEmailAvailability = async (email: string): Promise<boolean> => {
  try {
    await authService.checkEmail(email);
    return true; // Email is available
  } catch (error: any) {
    // If email exists, API will return an error
    if (error.response?.status === 409 || error.response?.status === 400) {
      return false; // Email already exists
    }
    // For other errors, allow the form to proceed (will be caught during registration)
    return true;
  }
};

const checkPhoneAvailability = async (phone: string): Promise<boolean> => {
  try {
    await authService.checkPhone(phone);
    return true; // Phone is available
  } catch (error: any) {
    // If phone exists, API will return an error
    if (error.response?.status === 409 || error.response?.status === 400) {
      return false; // Phone already exists
    }
    // For other errors, allow the form to proceed (will be caught during registration)
    return true;
  }
};

const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, VALIDATION_MESSAGES.FIRST_NAME_REQUIRED)
    .min(VALIDATION_RULES.FIRST_NAME_MIN_LENGTH, VALIDATION_MESSAGES.FIRST_NAME_MIN),
  lastName: z
    .string()
    .min(1, VALIDATION_MESSAGES.LAST_NAME_REQUIRED)
    .min(VALIDATION_RULES.LAST_NAME_MIN_LENGTH, VALIDATION_MESSAGES.LAST_NAME_MIN),
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.EMAIL_REQUIRED)
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .regex(VALIDATION_PATTERNS.EMAIL, VALIDATION_MESSAGES.EMAIL_FORMAT),
  phone: z
    .string()
    .min(1, VALIDATION_MESSAGES.PHONE_REQUIRED)
    .min(VALIDATION_RULES.PHONE_EXACT_LENGTH, VALIDATION_MESSAGES.PHONE_EXACT_LENGTH)
    .max(VALIDATION_RULES.PHONE_EXACT_LENGTH, VALIDATION_MESSAGES.PHONE_EXACT_LENGTH)
    .regex(VALIDATION_PATTERNS.PHONE, VALIDATION_MESSAGES.PHONE_DIGITS_ONLY),
  password: z
    .string()
    .min(1, VALIDATION_MESSAGES.PASSWORD_REQUIRED)
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.PASSWORD_MIN),
  confirmPassword: z.string().min(1, VALIDATION_MESSAGES.CONFIRM_PASSWORD_REQUIRED),
  role: z.enum([USER_ROLES.PATIENT, USER_ROLES.DOCTOR, USER_ROLES.ADMIN] as [string, ...string[]], {
    required_error: VALIDATION_MESSAGES.ROLE_REQUIRED,
    invalid_type_error: VALIDATION_MESSAGES.ROLE_INVALID,
  }),
  dateOfBirth: z.string().optional(),
  gender: z
    .string()
    .min(1, VALIDATION_MESSAGES.GENDER_REQUIRED)
    .refine(
      (val) => val === GENDERS.MALE || val === GENDERS.FEMALE || val === GENDERS.OTHER,
      {
        message: VALIDATION_MESSAGES.GENDER_INVALID,
      }
    ),
  licenseNumber: z.string().optional(),
  specialization: z.string().optional(),
  education: z.array(z.object({
    degree: z.string().optional(),
    institution: z.string().optional(),
    year: z.number().optional()
  })).optional(),
  languages: z.array(z.string()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH,
  path: ['confirmPassword'],
}).refine((data) => {
  // License number is required only for doctors
  if (data.role === USER_ROLES.DOCTOR) {
    const license = data.licenseNumber?.trim() || '';
    if (!license) {
      return false;
    }
    // Check minimum length
    if (license.length < VALIDATION_RULES.LICENSE_NUMBER_MIN_LENGTH) {
      return false;
    }
    // Check maximum length
    if (license.length > VALIDATION_RULES.LICENSE_NUMBER_MAX_LENGTH) {
      return false;
    }
    return true;
  }
  return true;
}, {
  message: VALIDATION_MESSAGES.LICENSE_NUMBER_REQUIRED,
  path: ['licenseNumber'],
}).refine((data) => {
  // License number format validation - must contain at least one letter and one number
  if (data.role === USER_ROLES.DOCTOR && data.licenseNumber) {
    const license = data.licenseNumber.trim();
    if (license.length >= VALIDATION_RULES.LICENSE_NUMBER_MIN_LENGTH) {
      const hasLetter = /[A-Za-z]/.test(license);
      const hasNumber = /[0-9]/.test(license);
      return hasLetter && hasNumber;
    }
  }
  return true;
}, {
  message: VALIDATION_MESSAGES.LICENSE_NUMBER_FORMAT,
  path: ['licenseNumber'],
}).refine((data) => {
  // Specialization is required only for doctors
  if (data.role === USER_ROLES.DOCTOR) {
    return data.specialization && data.specialization.trim().length >= 2;
  }
  return true;
}, {
  message: VALIDATION_MESSAGES.SPECIALIZATION_REQUIRED,
  path: ['specialization'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);

  // Get role from query parameter if present
  const roleParam = searchParams.get('role');
  const initialRole = roleParam === 'doctor' ? USER_ROLES.DOCTOR : 
                      roleParam === 'patient' ? USER_ROLES.PATIENT : 
                      USER_ROLES.PATIENT;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
      licenseNumber: '',
      specialization: '',
      education: [],
      languages: [],
    },
  });

  // Update role when query parameter changes
  useEffect(() => {
    if (roleParam && (roleParam === 'doctor' || roleParam === 'patient')) {
      const roleValue = roleParam === 'doctor' ? USER_ROLES.DOCTOR : USER_ROLES.PATIENT;
      setValue('role', roleValue);
    }
  }, [roleParam, setValue]);

  const watchedPassword = watch('password');
  const watchedRole = watch('role');

  // Fetch specializations when component mounts
  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    setLoadingSpecializations(true);
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

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (!password) return { strength: '', color: '', width: '0%' };
    if (password.length < 6) return { strength: 'Weak', color: 'bg-danger-500', width: '33%' };
    if (password.length < 10) return { strength: 'Medium', color: 'bg-warning-500', width: '66%' };
    return { strength: 'Strong', color: 'bg-success-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(watchedPassword || '');

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      // Encrypt password before sending to server
      registerData.password = encryptPassword(registerData.password);
      const result = await registerUser({
        ...registerData,
        role: registerData.role as UserRole,
      });
      
      // If doctor registration requires approval, show message and redirect to login
      if (result?.requiresApproval) {
        // Reset form to default values
        reset({
          role: USER_ROLES.PATIENT,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          dateOfBirth: '',
          gender: undefined,
          licenseNumber: '',
          specialization: '',
          education: [],
          languages: [],
        });
        // Redirect to login page with message
        navigate('/login');
        return;
      }
      
      // Reset form to default values
      reset({
        role: USER_ROLES.PATIENT,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        gender: undefined,
          licenseNumber: '',
          specialization: '',
          education: [],
          languages: [],
        });
      
      // If accessed via admin dashboard (with role query param), redirect back to admin dashboard
      // Otherwise, redirect to login page
      if (roleParam) {
        navigate(DASHBOARD_ROUTES.ADMIN.OVERVIEW);
      } else {
        navigate('/login');
      }
    } catch (error: any) {
      // Handle specific duplicate errors from backend
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.toLowerCase().includes('email')) {
        setError('email', {
          type: 'manual',
          message: VALIDATION_MESSAGES.EMAIL_ALREADY_REGISTERED,
        });
      } else if (errorMessage.toLowerCase().includes('phone')) {
        setError('phone', {
          type: 'manual',
          message: VALIDATION_MESSAGES.PHONE_ALREADY_REGISTERED,
        });
      } else if (errorMessage.toLowerCase().includes('license')) {
        setError('licenseNumber', {
          type: 'manual',
          message: VALIDATION_MESSAGES.LICENSE_NUMBER_ALREADY_REGISTERED,
        });
      }
      // Error toast is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const roleIcons: Record<string, string> = {
    [USER_ROLES.PATIENT]: '👤',
    [USER_ROLES.DOCTOR]: '👨‍⚕️',
    [USER_ROLES.ADMIN]: '👨‍💼',
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Navbar />
      <div className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          {!roleParam || roleParam !== 'doctor' ? (
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-500 rounded-full mb-4">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Create your account
              </h1>
              <p className="text-gray-600">
                Join {PROJECT_CONFIG.name} and start managing your healthcare journey
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-500 rounded-full mb-4">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Add New Doctor
              </h1>
              <p className="text-gray-600">
                Register a new doctor to the system
              </p>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 md:p-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Role Selection - Hidden when accessed from admin */}
              {(!roleParam || roleParam !== 'doctor') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    I am a <span className="text-danger-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {USER_ROLE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`
                          relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                          ${watchedRole === option.value
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50'
                          }
                        `}
                      >
                        <input
                          {...register('role')}
                          type="radio"
                          value={option.value}
                          className="sr-only"
                        />
                        <span className="text-3xl mb-2">{roleIcons[option.value]}</span>
                        <span className={`font-medium ${watchedRole === option.value ? 'text-primary-600' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                        {watchedRole === option.value && (
                          <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-primary-500" />
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.role && (
                    <p className="mt-2 text-sm text-danger-500 flex items-center">
                      <span className="mr-1">⚠</span> {errors.role.message}
                    </p>
                  )}
                </div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('firstName')}
                      type="text"
                      id="firstName"
                      placeholder="John"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-danger-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('lastName')}
                      type="text"
                      id="lastName"
                      placeholder="Doe"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-danger-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email ID <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      onBlur: async (e) => {
                        const email = e.target.value.trim();
                        if (email && VALIDATION_PATTERNS.EMAIL.test(email)) {
                          try {
                            const isAvailable = await checkEmailAvailability(email);
                            if (!isAvailable) {
                              setError('email', {
                                type: 'manual',
                                message: VALIDATION_MESSAGES.EMAIL_ALREADY_REGISTERED,
                              });
                            } else {
                              clearErrors('email');
                            }
                          } catch (error) {
                            // Silently handle check errors - validation will catch during submit
                          }
                        }
                      },
                    })}
                    type="email"
                    id="email"
                    placeholder="john.doe@example.com"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-500">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('phone', {
                      onBlur: async (e) => {
                        const phone = e.target.value.replace(/\D/g, '');
                        if (phone && phone.length === 10) {
                          try {
                            const isAvailable = await checkPhoneAvailability(phone);
                            if (!isAvailable) {
                              setError('phone', {
                                type: 'manual',
                                message: VALIDATION_MESSAGES.PHONE_ALREADY_REGISTERED,
                              });
                            } else {
                              clearErrors('phone');
                            }
                          } catch (error) {
                            // Silently handle check errors - validation will catch during submit
                          }
                        }
                      },
                    })}
                    type="tel"
                    id="phone"
                    placeholder="1234567890"
                    maxLength={10}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    onInput={(e) => {
                      // Only allow digits and limit to 10
                      const value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10);
                      setValue('phone', value, { shouldValidate: false });
                      // Clear error when user starts typing
                      if (errors.phone) {
                        clearErrors('phone');
                      }
                    }}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-danger-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Doctor-Specific Fields */}
              {watchedRole === USER_ROLES.DOCTOR && (
                <>
                  <div>
                    <label htmlFor="specialization" className="block text-sm font-semibold text-gray-700 mb-2">
                      Specialization <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <UserCircle className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('specialization')}
                        id="specialization"
                        disabled={loadingSpecializations}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingSpecializations ? 'Loading specializations...' : 'Select your specialization'}
                        </option>
                        {specializations.map((spec) => (
                          <option key={spec._id || spec.id} value={spec.name}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.specialization && (
                      <p className="mt-1 text-sm text-danger-500">{errors.specialization.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                      License Number <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Award className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('licenseNumber', {
                          onChange: (e) => {
                            // Convert to uppercase and allow only alphanumeric characters, /, and -
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\/\-]/g, '');
                            setValue('licenseNumber', value, { shouldValidate: false });
                            if (errors.licenseNumber) {
                              clearErrors('licenseNumber');
                            }
                          },
                        })}
                        type="text"
                        id="licenseNumber"
                        placeholder="e.g., MD123456 or AB/12345"
                        maxLength={VALIDATION_RULES.LICENSE_NUMBER_MAX_LENGTH}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors uppercase"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Minimum 6 characters, maximum 20 characters. Format: Letters and numbers (e.g., MD123456, AB/12345)
                    </p>
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-danger-500">{errors.licenseNumber.message}</p>
                    )}
                  </div>

                  {/* Education Section */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Education
                    </label>
                    <div id="education-container" className="space-y-3">
                      {watch('education')?.map((edu: any, index: number) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="text"
                            placeholder="Degree (e.g., MBBS, MD)"
                            value={edu?.degree || ''}
                            onChange={(e) => {
                              const education = watch('education') || [];
                              education[index] = { ...education[index], degree: e.target.value };
                              setValue('education', education);
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <input
                            type="text"
                            placeholder="Institution"
                            value={edu?.institution || ''}
                            onChange={(e) => {
                              const education = watch('education') || [];
                              education[index] = { ...education[index], institution: e.target.value };
                              setValue('education', education);
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Year"
                              value={edu?.year || ''}
                              onChange={(e) => {
                                const education = watch('education') || [];
                                education[index] = { ...education[index], year: e.target.value ? parseInt(e.target.value) : undefined };
                                setValue('education', education);
                              }}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const education = watch('education') || [];
                                education.splice(index, 1);
                                setValue('education', education);
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const education = watch('education') || [];
                        setValue('education', [...education, { degree: '', institution: '', year: undefined }]);
                      }}
                      className="mt-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      Add Education
                    </button>
                  </div>

                  {/* Languages Section */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Languages Spoken
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {watch('languages')?.map((lang: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() => {
                              const languages = watch('languages') || [];
                              languages.splice(index, 1);
                              setValue('languages', languages);
                            }}
                            className="hover:text-primary-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="languageInput"
                        placeholder="Enter language (e.g., English, Hindi)"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const language = input.value.trim();
                            if (language) {
                              const languages = watch('languages') || [];
                              if (!languages.includes(language)) {
                                setValue('languages', [...languages, language]);
                                input.value = '';
                              }
                            }
                          }
                        }}
                        className="flex-1 block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('languageInput') as HTMLInputElement;
                          const language = input.value.trim();
                          if (language) {
                            const languages = watch('languages') || [];
                            if (!languages.includes(language)) {
                              setValue('languages', [...languages, language]);
                              input.value = '';
                            }
                          }
                        }}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Optional Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <DatePickerComponent
                    selected={watch('dateOfBirth') ? new Date(watch('dateOfBirth')) : null}
                    onChange={(date) => {
                      if (date) {
                        setValue('dateOfBirth', format(date, 'yyyy-MM-dd'), { shouldValidate: true });
                      } else {
                        setValue('dateOfBirth', '', { shouldValidate: true });
                      }
                    }}
                    placeholderText="Select date of birth"
                    dateFormat="MM/dd/yyyy"
                    maxDate={new Date()}
                    className="input-field"
                      id="dateOfBirth"
                    />
                  <input type="hidden" {...register('dateOfBirth')} />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <UserCircle className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                      {...register('gender')}
                      id="gender"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors appearance-none bg-white"
                    >
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-danger-500">{errors.gender.message}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="At least 6 characters"
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {watchedPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password strength:</span>
                      <span className={`text-xs font-medium ${passwordStrength.strength === 'Strong' ? 'text-success-600' : passwordStrength.strength === 'Medium' ? 'text-warning-600' : 'text-danger-600'}`}>
                        {passwordStrength.strength}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      ></div>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-500">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="Re-enter your password"
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 text-white py-3.5 px-4 rounded-lg font-semibold text-base hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating your account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500 mt-4">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500 font-medium">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500 font-medium">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
