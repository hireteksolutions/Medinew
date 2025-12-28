import { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Mail, Phone, MapPin, User, MessageSquare, FileText, Send } from 'lucide-react';
import { PROJECT_CONFIG } from '../config';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VALIDATION_MESSAGES, VALIDATION_PATTERNS, VALIDATION_RULES, TOAST_MESSAGES } from '../constants';
import toast from 'react-hot-toast';
import { contactInfoService } from '../services/api';

const contactSchema = z.object({
  name: z
    .string()
    .min(1, VALIDATION_MESSAGES.NAME_REQUIRED)
    .min(VALIDATION_RULES.CONTACT_NAME_MIN_LENGTH, VALIDATION_MESSAGES.NAME_MIN),
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.EMAIL_REQUIRED)
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .regex(VALIDATION_PATTERNS.EMAIL, VALIDATION_MESSAGES.EMAIL_FORMAT),
  subject: z
    .string()
    .min(1, VALIDATION_MESSAGES.SUBJECT_REQUIRED)
    .min(VALIDATION_RULES.CONTACT_SUBJECT_MIN_LENGTH, VALIDATION_MESSAGES.SUBJECT_MIN)
    .max(VALIDATION_RULES.CONTACT_SUBJECT_MAX_LENGTH, VALIDATION_MESSAGES.SUBJECT_MAX),
  message: z
    .string()
    .min(1, VALIDATION_MESSAGES.MESSAGE_REQUIRED)
    .min(VALIDATION_RULES.CONTACT_MESSAGE_MIN_LENGTH, VALIDATION_MESSAGES.MESSAGE_MIN)
    .max(VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH, VALIDATION_MESSAGES.MESSAGE_MAX),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [loadingContactInfo, setLoadingContactInfo] = useState(true);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await contactInfoService.get();
        setContactInfo(response.data);
      } catch (error) {
        console.error('Error fetching contact info:', error);
        // Set default values if API fails
        setContactInfo({
          address: '123 Medical Street, Health City, HC 12345',
          phone: '+1 (555) 123-4567',
          email: PROJECT_CONFIG.email
        });
      } finally {
        setLoadingContactInfo(false);
      }
    };
    fetchContactInfo();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const watchedSubject = watch('subject', '');
  const watchedMessage = watch('message', '');

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      // TODO: Implement API call to send contact message
      // await contactService.sendMessage(data);
      console.log('Contact form data:', data); // For development/debugging
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Message sent successfully!');
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.MESSAGE_SEND_FAILED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-base sm:text-lg text-gray-600">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Contact Information */}
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Mail className="w-6 h-6 text-primary-500 mr-2" />
              Get in Touch
            </h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600">
                    {loadingContactInfo ? 'Loading...' : (contactInfo?.address || '123 Medical Street, Health City, HC 12345')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">
                    {loadingContactInfo ? 'Loading...' : (contactInfo?.phone || '+1 (555) 123-4567')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">
                    {loadingContactInfo ? 'Loading...' : (contactInfo?.email || PROJECT_CONFIG.email)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <MessageSquare className="w-6 h-6 text-primary-500 mr-2" />
              Send us a Message
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="Your full name"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-danger-500">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    placeholder="your.email@example.com"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-500">{errors.email.message}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('subject')}
                    type="text"
                    id="subject"
                    placeholder="What is this regarding?"
                    maxLength={VALIDATION_RULES.CONTACT_SUBJECT_MAX_LENGTH}
                    className="block w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs text-gray-400">
                      {watchedSubject.length}/{VALIDATION_RULES.CONTACT_SUBJECT_MAX_LENGTH}
                    </span>
                  </div>
                </div>
                {errors.subject && (
                  <p className="mt-1 text-sm text-danger-500">{errors.subject.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    {...register('message')}
                    id="message"
                    rows={6}
                    placeholder="Tell us more about your inquiry..."
                    maxLength={VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                  />
                  <div className="absolute bottom-3 right-3">
                    <span className={`text-xs ${watchedMessage.length > VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH * 0.9 ? 'text-danger-500' : 'text-gray-400'}`}>
                      {watchedMessage.length}/{VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH}
                    </span>
                  </div>
                </div>
                {errors.message && (
                  <p className="mt-1 text-sm text-danger-500">{errors.message.message}</p>
                )}
              </div>

              {/* Submit Button */}
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
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
