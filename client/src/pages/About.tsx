import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Heart, Users, Award, Shield } from 'lucide-react';
import { PROJECT_CONFIG } from '../config';

export default function About() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">About {PROJECT_CONFIG.name}</h1>
        
        <div className="card mb-6 sm:mb-8">
          <p className="text-base sm:text-lg text-gray-700 mb-4">
            {PROJECT_CONFIG.name} is {PROJECT_CONFIG.description.toLowerCase()} designed to connect patients with healthcare providers
            seamlessly. We strive to make healthcare accessible, convenient, and efficient for everyone.
          </p>
          <p className="text-base sm:text-lg text-gray-700">
            Our platform enables patients to book appointments, manage their medical records, and communicate
            with doctors, all in one place. For healthcare providers, we offer tools to manage schedules,
            patient records, and appointments efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="card">
            <Heart className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700">
              To revolutionize healthcare delivery by making it more accessible, efficient, and patient-centered
              through innovative technology.
            </p>
          </div>
          <div className="card">
            <Users className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
            <p className="text-gray-700">
              To be the leading healthcare platform that connects patients and providers, improving healthcare
              outcomes for everyone.
            </p>
          </div>
          <div className="card">
            <Award className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Quality Care</h2>
            <p className="text-gray-700">
              We partner with certified and experienced healthcare professionals to ensure the highest
              quality of care for our patients.
            </p>
          </div>
          <div className="card">
            <Shield className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Security & Privacy</h2>
            <p className="text-gray-700">
              Your health data is protected with industry-standard security measures. We prioritize
              your privacy and confidentiality.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

