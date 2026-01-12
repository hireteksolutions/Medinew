import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { 
  Calendar, 
  Users, 
  Award, 
  Heart, 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Clock, 
  Stethoscope,
  Activity,
  Star,
  Quote,
  Sparkles,
  MapPin
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { doctorService } from '../services/api';
import FavoriteButton from '../components/common/FavoriteButton';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../constants';
import { Carousel } from '../components/common/Carousel';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

// Medical Illustration Component
const MedicalIllustration = ({ type }: { type: 'doctor' | 'patient' | 'technology' }) => {
  const illustrations = {
    doctor: (
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <circle cx="200" cy="150" r="60" fill="#00bcd4" opacity="0.2"/>
        <circle cx="200" cy="150" r="40" fill="#00bcd4" opacity="0.3"/>
        <path d="M200 120 L220 140 L200 160 L180 140 Z" fill="#00bcd4"/>
        <rect x="180" y="200" width="40" height="100" rx="20" fill="#0284c7"/>
        <circle cx="200" cy="120" r="30" fill="#0284c7"/>
        <path d="M150 250 Q200 230 250 250" stroke="#00bcd4" strokeWidth="3" fill="none"/>
      </svg>
    ),
    patient: (
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <circle cx="200" cy="150" r="60" fill="#22c55e" opacity="0.2"/>
        <circle cx="200" cy="150" r="40" fill="#22c55e" opacity="0.3"/>
        <path d="M200 120 L220 140 L200 160 L180 140 Z" fill="#22c55e"/>
        <rect x="180" y="200" width="40" height="100" rx="20" fill="#16a34a"/>
        <circle cx="200" cy="120" r="30" fill="#16a34a"/>
        <path d="M150 250 Q200 230 250 250" stroke="#22c55e" strokeWidth="3" fill="none"/>
      </svg>
    ),
    technology: (
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <rect x="100" y="100" width="200" height="200" rx="20" fill="#0ea5e9" opacity="0.2"/>
        <circle cx="200" cy="200" r="80" fill="#0ea5e9" opacity="0.1"/>
        <rect x="150" y="150" width="100" height="100" rx="10" fill="#0284c7"/>
        <circle cx="200" cy="200" r="30" fill="#00bcd4"/>
        <path d="M170 200 L190 220 L230 180" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </svg>
    )
  };
  return <div className="w-full h-full">{illustrations[type]}</div>;
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredDoctors, setFeaturedDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user) {
      const dashboardRoute = getDashboardPath(user.role);
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only fetch featured doctors if user is not logged in
    if (!user) {
      const fetchFeaturedDoctors = async () => {
        try {
          const response = await doctorService.getFeatured();
          // Ensure response.data is an array
          const doctors = Array.isArray(response.data) ? response.data : [];
          setFeaturedDoctors(doctors);
        } catch (error) {
          setFeaturedDoctors([]);
        } finally {
          setLoading(false);
        }
      };
      fetchFeaturedDoctors();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Testimonials for carousel
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Patient',
      content: 'The platform made booking appointments so easy. I found the perfect cardiologist and the consultation was excellent!',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Patient',
      content: 'Outstanding service! The doctors are professional, and the online system is very user-friendly. Highly recommend!',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Patient',
      content: 'I love how I can manage all my medical records in one place. The platform is secure and easy to use.',
      rating: 5
    }
  ];


  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Modern Medical Design */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-medical-50 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-medical-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                <Shield className="w-4 h-4 mr-2" />
                Trusted Healthcare Platform
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up">
                Your Health, Our{' '}
                <span className="text-primary-600">Priority</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-fade-in">
                Experience world-class healthcare with our network of expert doctors. 
                Book appointments, manage your health records, and receive personalized care—all in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  to="/doctors"
                  className="group bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center justify-center text-base animate-bounce-in"
                >
                  Find a Doctor
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/book-appointment"
                  className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-300 border-2 border-primary-600 shadow-md hover:shadow-lg inline-flex items-center justify-center text-base animate-bounce-in"
                >
                  Book Appointment
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
                  <span>Certified Doctors</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
                  <span>Secure & Private</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual Elements with Illustration */}
            <div className="hidden lg:block relative">
              <div className="relative bg-gradient-to-br from-primary-100 to-medical-100 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-12 -mb-12"></div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Stethoscope className="w-12 h-12 text-primary-600 mb-3" />
                    <AnimatedCounter value={500} suffix="+" className="text-3xl font-bold text-gray-900" />
                    <div className="text-sm text-gray-600">Expert Doctors</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Users className="w-12 h-12 text-medical-600 mb-3" />
                    <AnimatedCounter value={10000} suffix="+" className="text-3xl font-bold text-gray-900" />
                    <div className="text-sm text-gray-600">Happy Patients</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Award className="w-12 h-12 text-success-600 mb-3" />
                    <AnimatedCounter value={50} suffix="+" className="text-3xl font-bold text-gray-900" />
                    <div className="text-sm text-gray-600">Specializations</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Clock className="w-12 h-12 text-primary-600 mb-3" />
                    <div className="text-3xl font-bold text-gray-900">24/7</div>
                    <div className="text-sm text-gray-600">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced with Animated Counters */}
      <section className="py-12 sm:py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4 group-hover:bg-primary-200 transition-colors group-hover:scale-110 transform duration-300">
                <Stethoscope className="w-8 h-8 text-primary-600" />
              </div>
              <AnimatedCounter value={500} suffix="+" className="text-4xl sm:text-5xl font-bold text-primary-600 mb-2" />
              <div className="text-gray-600 font-medium">Expert Doctors</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-medical-100 rounded-full mb-4 group-hover:bg-medical-200 transition-colors group-hover:scale-110 transform duration-300">
                <Users className="w-8 h-8 text-medical-600" />
              </div>
              <AnimatedCounter value={10000} suffix="+" className="text-4xl sm:text-5xl font-bold text-medical-600 mb-2" />
              <div className="text-gray-600 font-medium">Happy Patients</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-4 group-hover:bg-success-200 transition-colors group-hover:scale-110 transform duration-300">
                <Award className="w-8 h-8 text-success-600" />
              </div>
              <AnimatedCounter value={50} suffix="+" className="text-4xl sm:text-5xl font-bold text-success-600 mb-2" />
              <div className="text-gray-600 font-medium">Specializations</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4 group-hover:bg-primary-200 transition-colors group-hover:scale-110 transform duration-300">
                <Clock className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-4xl sm:text-5xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-gray-600 font-medium">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Our Platform - Redesigned */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-primary-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-medical-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Platform Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience healthcare reimagined with cutting-edge technology, expert care, and seamless convenience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: '24/7 Availability',
                description: 'Book appointments anytime, anywhere with our round-the-clock platform. No more waiting for business hours.',
                icon: Clock,
                gradient: 'from-blue-500 to-cyan-500',
                bgGradient: 'from-blue-50 to-cyan-50',
                borderColor: 'border-blue-200',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                number: '01'
              },
              {
                title: 'Expert Doctors',
                description: 'Connect with board-certified medical professionals in various specializations. Quality care you can trust.',
                icon: Stethoscope,
                gradient: 'from-primary-500 to-primary-600',
                bgGradient: 'from-primary-50 to-primary-100',
                borderColor: 'border-primary-200',
                iconBg: 'bg-primary-100',
                iconColor: 'text-primary-600',
                number: '02'
              },
              {
                title: 'Secure Records',
                description: 'Your health data is protected with industry-leading security measures. Privacy and security guaranteed.',
                icon: Shield,
                gradient: 'from-green-500 to-emerald-500',
                bgGradient: 'from-green-50 to-emerald-50',
                borderColor: 'border-green-200',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
                number: '03'
              },
              {
                title: 'Instant Booking',
                description: 'Schedule appointments in seconds with our intuitive booking system. Quick, easy, and hassle-free.',
                icon: Calendar,
                gradient: 'from-purple-500 to-pink-500',
                bgGradient: 'from-purple-50 to-pink-50',
                borderColor: 'border-purple-200',
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                number: '04'
              },
              {
                title: 'Digital Records',
                description: 'Access your medical records, prescriptions, and test results anytime from anywhere. All in one place.',
                icon: Activity,
                gradient: 'from-orange-500 to-red-500',
                bgGradient: 'from-orange-50 to-red-50',
                borderColor: 'border-orange-200',
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600',
                number: '05'
              },
              {
                title: 'Expert Support',
                description: 'Get help when you need it with our dedicated support team. We\'re here for you every step of the way.',
                icon: Users,
                gradient: 'from-indigo-500 to-blue-500',
                bgGradient: 'from-indigo-50 to-blue-50',
                borderColor: 'border-indigo-200',
                iconBg: 'bg-indigo-100',
                iconColor: 'text-indigo-600',
                number: '06'
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group relative bg-white rounded-2xl p-8 border-2 ${feature.borderColor} hover:border-transparent transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 overflow-hidden`}
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  
                  {/* Number badge */}
                  <div className={`absolute top-6 right-6 w-12 h-12 rounded-full bg-gradient-to-br ${feature.gradient} text-white flex items-center justify-center font-bold text-lg opacity-10 group-hover:opacity-20 transition-opacity`}>
                    {feature.number}
                  </div>
                  
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.iconBg} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-8 h-8 ${feature.iconColor} group-hover:scale-110 transition-transform`} />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-medical-600 transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-base">
                      {feature.description}
                    </p>
                    
                    {/* Decorative element */}
                    <div className={`mt-6 w-12 h-1 bg-gradient-to-r ${feature.gradient} rounded-full group-hover:w-20 transition-all duration-300`}></div>
                  </div>
                  
                  {/* Hover effect overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-2xl`}></div>
                </div>
              );
            })}
          </div>
          
          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-medical-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">Join thousands of satisfied patients</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Enhanced */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Medical Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive healthcare services delivered by experienced medical professionals
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { 
                name: 'Cardiology', 
                icon: Heart, 
                desc: 'Expert heart and cardiovascular care with advanced diagnostic tools',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-500'
              },
              { 
                name: 'Pediatrics', 
                icon: Users, 
                desc: 'Compassionate child healthcare services from birth through adolescence',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-500'
              },
              { 
                name: 'Orthopedics', 
                icon: Activity, 
                desc: 'Specialized bone, joint, and musculoskeletal treatment and rehabilitation',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-500'
              },
            ].map((service) => (
              <div 
                key={service.name} 
                className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 ${service.iconBg} rounded-xl mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon className={`w-8 h-8 ${service.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.name}</h3>
                <p className="text-gray-600 leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              View All Services
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Doctors - Enhanced */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Expert Doctors
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Meet our highly qualified medical professionals dedicated to your health
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Loading doctors...</p>
            </div>
          ) : featuredDoctors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Stethoscope className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No featured doctors available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredDoctors.slice(0, 6).map((doctor) => (
                <div
                  key={doctor._id}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <FavoriteButton doctorId={doctor.userId._id} size="md" />
                  </div>
                  
                  <Link to={`/doctors/${doctor.userId._id}`} className="block p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      {doctor.userId.profileImage ? (
                        <img
                          src={doctor.userId.profileImage}
                          alt={doctor.userId.firstName}
                          className="w-20 h-20 rounded-full object-cover border-4 border-primary-100 group-hover:border-primary-300 transition-colors"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-primary-100 group-hover:border-primary-300 transition-colors">
                          {doctor.userId.firstName[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                          Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                        </h3>
                        <p className="text-primary-600 font-medium text-sm mb-1">{doctor.specialization}</p>
                        {doctor.currentHospitalName && (
                          <p className="text-gray-600 text-xs mb-1 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate">{doctor.currentHospitalName}</span>
                          </p>
                        )}
                        {doctor.education && doctor.education.length > 0 && doctor.education[0] && (
                          <p className="text-gray-600 text-xs mb-2 flex items-center">
                            <Award className="w-3 h-3 mr-1" />
                            <span className="truncate">
                              {doctor.education[0].degree}
                              {doctor.education[0].institution && ` - ${doctor.education[0].institution}`}
                            </span>
                          </p>
                        )}
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="ml-1 font-semibold text-gray-900">{doctor.rating.toFixed(1)}</span>
                          <span className="text-gray-500 ml-2 text-sm">({doctor.totalReviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Experience</p>
                          <p className="font-semibold text-gray-900">{doctor.experience || 'N/A'} years</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Consultation</p>
                          <p className="font-bold text-primary-600 text-lg">₹{doctor.consultationFee}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          
          {!loading && featuredDoctors.length > 0 && (
            <div className="text-center mt-10">
              <Link
                to="/doctors"
                className="inline-flex items-center bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                View All Doctors
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary-50 via-white to-medical-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Our Patients Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real experiences from patients who trust us with their healthcare
            </p>
          </div>
          
          <Carousel
            items={testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-3xl p-8 sm:p-12 shadow-lg mx-4">
                <div className="flex items-center mb-6">
                  <Quote className="w-12 h-12 text-primary-600 opacity-50" />
                </div>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            autoPlay={true}
            interval={5000}
            className="max-w-4xl mx-auto"
          />
        </div>
      </section>

      {/* Infographics Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Healthcare at Your Fingertips
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Visual insights into our healthcare platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-6">
                <MedicalIllustration type="doctor" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Expert Doctors</h3>
              <p className="text-gray-700">Connect with certified medical professionals</p>
            </div>
            
            <div className="bg-gradient-to-br from-medical-50 to-medical-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-6">
                <MedicalIllustration type="patient" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Patient-Centered</h3>
              <p className="text-gray-700">Your health and comfort are our priorities</p>
            </div>
            
            <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-6">
                <MedicalIllustration type="technology" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Modern Technology</h3>
              <p className="text-gray-700">Cutting-edge tools for better healthcare</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary-600 to-medical-600 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-white/80" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of patients who trust us with their healthcare needs. 
            Book your appointment today and experience the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book-appointment"
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center justify-center transform hover:scale-105"
            >
              Book Appointment Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="bg-transparent text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 border-2 border-white inline-flex items-center justify-center transform hover:scale-105"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
