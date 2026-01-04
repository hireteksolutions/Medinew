import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { 
  Heart, 
  Users, 
  Award, 
  Shield, 
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PROJECT_CONFIG } from '../config';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { Carousel } from '../components/common/Carousel';

const values = [
  {
    icon: Heart,
    title: 'Compassionate Care',
    desc: 'We believe in treating every patient with empathy, respect, and understanding. Your comfort and well-being are our top priorities.',
    color: 'text-red-500',
    bg: 'bg-red-100'
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    desc: 'Your health data is protected with industry-leading security measures. We prioritize your privacy and confidentiality above all.',
    color: 'text-primary-600',
    bg: 'bg-primary-100'
  },
  {
    icon: Award,
    title: 'Excellence',
    desc: 'We partner with certified and experienced healthcare professionals to ensure the highest quality of care for our patients.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-100'
  },
  {
    icon: TrendingUp,
    title: 'Innovation',
    desc: 'We leverage cutting-edge technology to provide accurate diagnosis, efficient treatment, and seamless healthcare experiences.',
    color: 'text-green-500',
    bg: 'bg-green-100'
  }
];

const stats = [
  { number: '500+', label: 'Expert Doctors', icon: Users },
  { number: '10K+', label: 'Happy Patients', icon: Heart },
  { number: '50+', label: 'Specializations', icon: Award },
  { number: '24/7', label: 'Support Available', icon: Clock }
];

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-medical-600 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            About {PROJECT_CONFIG.name}
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-3xl mx-auto">
            Your trusted healthcare partner, dedicated to making quality medical care 
            accessible, convenient, and efficient for everyone.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 mb-16">
            <div className="bg-gradient-to-br from-primary-50 to-medical-50 rounded-3xl p-8 sm:p-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                To revolutionize healthcare delivery by making it more accessible, efficient, 
                and patient-centered through innovative technology. We strive to connect 
                patients with the best healthcare providers, ensuring quality care is 
                available to everyone, everywhere.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-medical-50 to-primary-50 rounded-3xl p-8 sm:p-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-medical-600 rounded-2xl mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                To be the leading healthcare platform that connects patients and providers, 
                improving healthcare outcomes for everyone. We envision a future where 
                quality healthcare is seamlessly integrated into people's lives, making 
                medical care more proactive, personalized, and accessible.
              </p>
            </div>
          </div>

          {/* About Content */}
          <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12 mb-16 border border-gray-100">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg sm:text-xl text-gray-700 mb-6 leading-relaxed">
                {PROJECT_CONFIG.name} is a modern healthcare management system designed to 
                connect patients with healthcare providers seamlessly. We understand that 
                healthcare is not just about treating illnesses—it's about building lasting 
                relationships, providing compassionate care, and empowering individuals 
                to take control of their health.
              </p>
              <p className="text-lg sm:text-xl text-gray-700 mb-6 leading-relaxed">
                Our platform enables patients to book appointments, manage their medical 
                records, and communicate with doctors, all in one convenient place. For 
                healthcare providers, we offer comprehensive tools to manage schedules, 
                patient records, and appointments efficiently, allowing them to focus on 
                what matters most—caring for patients.
              </p>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
                With a commitment to excellence, innovation, and patient-centered care, 
                we're transforming the way healthcare is delivered and experienced.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary-50 via-white to-medical-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Impact
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Numbers that reflect our commitment to excellence in healthcare
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const isAnimated = stat.number !== '24/7';
              return (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:scale-105"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold text-primary-600 mb-2">
                    {isAnimated ? (
                      stat.number.includes('K') ? (
                        <AnimatedCounter value={10} suffix="K+" />
                      ) : (
                        <AnimatedCounter value={parseInt(stat.number.replace('+', ''))} suffix="+" />
                      )
                    ) : (
                      stat.number
                    )}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Values - Carousel */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <Carousel
            items={values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className={`bg-gradient-to-br ${value.bg.replace('bg-', 'from-').replace('-100', '-50')} to-white rounded-3xl p-8 sm:p-12 mx-4 min-h-[350px] flex flex-col justify-center`}
                >
                  <div className={`inline-flex items-center justify-center w-20 h-20 ${value.bg} rounded-2xl mb-6`}>
                    <Icon className={`w-10 h-10 ${value.color}`} />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">{value.desc}</p>
                </div>
              );
            })}
            autoPlay={true}
            interval={5000}
            className="max-w-5xl mx-auto"
          />
        </div>
      </section>

      {/* Quality & Security */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-6">
                <Award className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Quality Care</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                We partner with certified and experienced healthcare professionals to ensure 
                the highest quality of care for our patients. All our doctors are board-certified, 
                continuously trained, and committed to staying current with the latest medical 
                advancements and best practices.
              </p>
              <ul className="space-y-3">
                {[
                  'Board-certified physicians',
                  'Continuous medical education',
                  'Evidence-based treatments',
                  'Regular quality assessments'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Security & Privacy</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Your health data is protected with industry-standard security measures. We prioritize 
                your privacy and confidentiality, ensuring that all medical information is encrypted, 
                securely stored, and accessible only to authorized healthcare providers.
              </p>
              <ul className="space-y-3">
                {[
                  'HIPAA compliant systems',
                  'End-to-end encryption',
                  'Regular security audits',
                  'Strict access controls'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary-600 to-medical-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Join Us on Your Healthcare Journey
          </h2>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Experience the difference of patient-centered care. Book your appointment today 
            and take the first step towards better health.
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
              to="/contact"
              className="bg-transparent text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 border-2 border-white inline-flex items-center justify-center"
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
