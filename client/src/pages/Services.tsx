import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Heart, Baby, Bone, Brain, Eye, Stethoscope } from 'lucide-react';

const services = [
  { name: 'Cardiology', icon: Heart, desc: 'Heart and cardiovascular care' },
  { name: 'Pediatrics', icon: Baby, desc: 'Child healthcare services' },
  { name: 'Orthopedics', icon: Bone, desc: 'Bone and joint treatment' },
  { name: 'Neurology', icon: Brain, desc: 'Brain and nervous system care' },
  { name: 'Dermatology', icon: Eye, desc: 'Skin care and treatment' },
  { name: 'General Medicine', icon: Stethoscope, desc: 'Comprehensive healthcare' },
];

export default function Services() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">Our Services</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.name} className="card hover:shadow-lg transition">
                <Icon className="w-12 h-12 text-primary-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">{service.name}</h2>
                <p className="text-gray-700">{service.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}

