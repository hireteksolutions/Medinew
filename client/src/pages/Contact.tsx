import { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Mail, Phone, MapPin, User, MessageSquare, FileText, Send, Clock } from 'lucide-react';
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
        // Error handled by default values
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-medical-600 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Get in Touch
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto">
            We're here to help. Reach out to us with any questions or concerns about your healthcare journey.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MapPin className="w-6 h-6 text-primary-600 mr-3" />
                Contact Information
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {loadingContactInfo ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : (
                        contactInfo?.address || '123 Medical Street, Health City, HC 12345'
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-medical-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-medical-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a 
                      href={`tel:${contactInfo?.phone || '+15551234567'}`}
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      {loadingContactInfo ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : (
                        contactInfo?.phone || '+1 (555) 123-4567'
                      )}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a 
                      href={`mailto:${contactInfo?.email || PROJECT_CONFIG.email}`}
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      {loadingContactInfo ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : (
                        contactInfo?.email || PROJECT_CONFIG.email
                      )}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 text-primary-600 mr-3" />
                Office Hours
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-semibold">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-semibold">9:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-semibold">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MessageSquare className="w-6 h-6 text-primary-600 mr-3" />
                Send us a Message
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('name')}
                      type="text"
                      id="name"
                      placeholder="John Doe"
                      className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-base"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-2 text-sm text-danger-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      placeholder="john.doe@example.com"
                      className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-base"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-danger-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('subject')}
                      type="text"
                      id="subject"
                      placeholder="What is this regarding?"
                      maxLength={VALIDATION_RULES.CONTACT_SUBJECT_MAX_LENGTH}
                      className="block w-full pl-12 pr-20 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-base"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-xs text-gray-400">
                        {watchedSubject.length}/{VALIDATION_RULES.CONTACT_SUBJECT_MAX_LENGTH}
                      </span>
                    </div>
                  </div>
                  {errors.subject && (
                    <p className="mt-2 text-sm text-danger-500">{errors.subject.message}</p>
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
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none text-base"
                    />
                    <div className="absolute bottom-3 right-3">
                      <span className={`text-xs ${watchedMessage.length > VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH * 0.9 ? 'text-danger-500' : 'text-gray-400'}`}>
                        {watchedMessage.length}/{VALIDATION_RULES.CONTACT_MESSAGE_MAX_LENGTH}
                      </span>
                    </div>
                  </div>
                  {errors.message && (
                    <p className="mt-2 text-sm text-danger-500">{errors.message.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-4 px-6 rounded-xl font-semibold text-base hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
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
      </div>
      <Footer />
    </div>
  );
}
