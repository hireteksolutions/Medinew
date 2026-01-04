import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { VALIDATION_MESSAGES, VALIDATION_PATTERNS, VALIDATION_RULES } from '../../constants/validation';
import { PROJECT_CONFIG } from '../../config';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Key, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import { TOAST_MESSAGES } from '../../constants';
import { encryptPassword } from '../../utils/encryption';

// Schema for reset password (when user knows old password)
const resetPasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(1, VALIDATION_MESSAGES.PASSWORD_REQUIRED)
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.PASSWORD_MIN),
  newPassword: z
    .string()
    .min(1, VALIDATION_MESSAGES.PASSWORD_REQUIRED)
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.PASSWORD_MIN),
  confirmPassword: z.string().min(1, VALIDATION_MESSAGES.CONFIRM_PASSWORD_REQUIRED),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH,
  path: ['confirmPassword'],
});

// Schema for forgot password (when user needs reset link)
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.EMAIL_REQUIRED)
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .regex(VALIDATION_PATTERNS.EMAIL, VALIDATION_MESSAGES.EMAIL_FORMAT),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'reset' | 'forgot'>('forgot');
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onResetPassword = async (data: ResetPasswordFormData) => {
    setLoading(true);
    try {
      // TODO: Implement API call to reset password
      // await authService.resetPassword(data.oldPassword, data.newPassword);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      toast.success(TOAST_MESSAGES.PASSWORD_CHANGED_SUCCESS);
      resetForm.reset();
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.PASSWORD_RESET_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const response = await authService.forgotPassword(data.email.toLowerCase().trim());
      toast.success(response.data?.message || TOAST_MESSAGES.PASSWORD_RESET_LINK_SENT);
      
      // In development, show the reset token if provided
      if (response.data?.resetToken && import.meta.env.DEV) {
        console.log('Reset Token (dev only):', response.data.resetToken);
        toast.success(`Reset Token: ${response.data.resetToken}`, { duration: 10000 });
      }
      
      forgotForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.PASSWORD_RESET_LINK_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (!password) return { strength: '', color: '', width: '0%' };
    if (password.length < 6) return { strength: 'Weak', color: 'bg-danger-500', width: '33%' };
    if (password.length < 10) return { strength: 'Medium', color: 'bg-warning-500', width: '66%' };
    return { strength: 'Strong', color: 'bg-success-500', width: '100%' };
  };

  const watchedNewPassword = resetForm.watch('newPassword', '');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Navbar />
      <div className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-500 rounded-full mb-4">
              <Key className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {mode === 'reset' ? 'Reset Password' : 'Forgot Password'}
            </h1>
            <p className="text-gray-600">
              {mode === 'reset'
                ? 'Enter your old password and choose a new one'
                : `We'll send a password reset link to your email`}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm p-1 flex">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  resetForm.reset();
                  forgotForm.reset();
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'forgot'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Get Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  resetForm.reset();
                  forgotForm.reset();
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'reset'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Reset Password
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 md:p-10">
            {mode === 'forgot' ? (
              // Forgot Password Form (Get Reset Link)
              <form onSubmit={forgotForm.handleSubmit(onForgotPassword)} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email ID <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...forgotForm.register('email')}
                      type="email"
                      id="email"
                      placeholder="your.email@example.com"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  {forgotForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-danger-500">
                      {forgotForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 text-white py-3.5 px-4 rounded-lg font-semibold text-base hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Reset Password Form (Change Password)
              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-5">
                {/* Old Password */}
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Old Password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...resetForm.register('oldPassword')}
                      type={showOldPassword ? 'text' : 'password'}
                      id="oldPassword"
                      placeholder="Enter your old password"
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showOldPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {resetForm.formState.errors.oldPassword && (
                    <p className="mt-1 text-sm text-danger-500">
                      {resetForm.formState.errors.oldPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...resetForm.register('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      placeholder="Enter your new password"
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {resetForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-danger-500">
                      {resetForm.formState.errors.newPassword.message}
                    </p>
                  )}
                  {/* Password Strength Indicator */}
                  {watchedNewPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Password strength</span>
                        <span className={`text-xs font-medium ${
                          getPasswordStrength(watchedNewPassword).strength === 'Weak' ? 'text-danger-500' :
                          getPasswordStrength(watchedNewPassword).strength === 'Medium' ? 'text-warning-500' :
                          'text-success-500'
                        }`}>
                          {getPasswordStrength(watchedNewPassword).strength}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            getPasswordStrength(watchedNewPassword).color
                          }`}
                          style={{ width: getPasswordStrength(watchedNewPassword).width }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...resetForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="Confirm your new password"
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
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-danger-500">
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 text-white py-3.5 px-4 rounded-lg font-semibold text-base hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

