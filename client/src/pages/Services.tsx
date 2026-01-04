import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { 
  Heart, 
  Baby, 
  Activity, 
  Brain, 
  Eye, 
  Stethoscope,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Carousel } from '../components/common/Carousel';

const services = [
  { 
    name: 'Cardiology', 
    icon: Heart, 
    desc: 'Comprehensive heart and cardiovascular care with advanced diagnostic tools and treatment options.',
    features: ['ECG & Stress Testing', 'Echocardiography', 'Cardiac Rehabilitation', 'Preventive Cardiology'],
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200'
  },
  { 
    name: 'Pediatrics', 
    icon: Baby, 
    desc: 'Compassionate child healthcare services from birth through adolescence with specialized care.',
    features: ['Well-child Visits', 'Vaccinations', 'Developmental Screening', 'Childhood Illness Treatment'],
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  { 
    name: 'Orthopedics', 
    icon: Activity, 
    desc: 'Specialized bone, joint, and musculoskeletal treatment and rehabilitation services.',
    features: ['Joint Replacement', 'Sports Medicine', 'Fracture Care', 'Physical Therapy'],
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200'
  },
  { 
    name: 'Neurology', 
    icon: Brain, 
    desc: 'Expert brain and nervous system care with cutting-edge diagnostic and treatment methods.',
    features: ['Neurological Exams', 'EEG & EMG Testing', 'Headache Management', 'Epilepsy Care'],
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200'
  },
  { 
    name: 'Dermatology', 
    icon: Eye, 
    desc: 'Comprehensive skin care and treatment for all dermatological conditions and concerns.',
    features: ['Skin Cancer Screening', 'Acne Treatment', 'Eczema Management', 'Cosmetic Procedures'],
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    borderColor: 'border-pink-200'
  },
  { 
    name: 'General Medicine', 
    icon: Stethoscope, 
    desc: 'Comprehensive primary healthcare services for all your general medical needs.',
    features: ['Annual Check-ups', 'Chronic Disease Management', 'Health Screenings', 'Preventive Care'],
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-200'
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Certified Professionals',
    desc: 'All our doctors are board-certified and continuously trained'
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    desc: 'Book appointments at your convenience, 24/7 online booking'
  },
  {
    icon: Users,
    title: 'Patient-Centered Care',
    desc: 'Personalized treatment plans tailored to your unique needs'
  }
];

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-medical-600 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Our Medical Services
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-3xl mx-auto">
            Comprehensive healthcare services delivered by experienced medical professionals 
            dedicated to your well-being and recovery.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Featured Services Carousel */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Featured Services
            </h2>
            <p className="text-gray-600">Explore our most popular medical specialties</p>
          </div>
          <Carousel
            items={services.slice(0, 3).map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className={`bg-gradient-to-br ${service.iconBg.replace('bg-', 'from-').replace('-100', '-50')} to-white rounded-3xl p-8 sm:p-12 mx-4 min-h-[400px] flex flex-col justify-center`}>
                  <div className={`inline-flex items-center justify-center w-20 h-20 ${service.iconBg} rounded-2xl mb-6`}>
                    <Icon className={`w-10 h-10 ${service.iconColor}`} />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{service.name}</h3>
                  <p className="text-lg text-gray-700 mb-6">{service.desc}</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {service.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <CheckCircle className={`w-4 h-4 ${service.iconColor} mr-2 flex-shrink-0`} />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/doctors"
                    className={`inline-flex items-center ${service.iconColor} font-semibold hover:underline`}
                  >
                    Find {service.name} Doctor
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              );
            })}
            autoPlay={true}
            interval={5000}
            className="max-w-6xl mx-auto"
          />
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div 
                key={service.name} 
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-primary-300 transform hover:-translate-y-2"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 ${service.iconBg} rounded-xl mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-8 h-8 ${service.iconColor}`} />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                  {service.name}
                </h2>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.desc}
                </p>
                
                <div className="space-y-3 mb-6">
                  {service.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className={`w-4 h-4 ${service.iconColor} mr-2 flex-shrink-0`} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link
                  to="/doctors"
                  className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors group-hover:translate-x-1"
                >
                  Find {service.name} Doctor
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Why Choose Our Services */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-medical-50 rounded-3xl p-8 sm:p-12 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're committed to providing exceptional healthcare experiences with the highest standards
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary-600 to-medical-600 rounded-3xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Book an Appointment?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Connect with our expert doctors and take the first step towards better health today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book-appointment"
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center justify-center"
            >
              Book Appointment
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/doctors"
              className="bg-transparent text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 border-2 border-white inline-flex items-center justify-center"
            >
              Browse Doctors
            </Link>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  );
}
