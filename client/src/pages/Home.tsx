import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Calendar, Users, Award, Heart, ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doctorService } from '../services/api';
import FavoriteButton from '../components/common/FavoriteButton';

export default function Home() {
  const [featuredDoctors, setFeaturedDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedDoctors = async () => {
      try {
        const response = await doctorService.getFeatured();
        // Ensure response.data is an array
        const doctors = Array.isArray(response.data) ? response.data : [];
        setFeaturedDoctors(doctors);
      } catch (error) {
        console.error('Error fetching featured doctors:', error);
        setFeaturedDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedDoctors();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              Your Health, Our Priority
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-primary-100 px-2">
              Book appointments with top doctors and manage your healthcare journey
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                to="/doctors"
                className="bg-white text-primary-500 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center text-sm sm:text-base"
              >
                Find a Doctor <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                to="/book-appointment"
                className="bg-primary-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-primary-800 transition border-2 border-white text-sm sm:text-base"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">500+</div>
              <div className="text-gray-600">Expert Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">10K+</div>
              <div className="text-gray-600">Happy Patients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">50+</div>
              <div className="text-gray-600">Specializations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Cardiology', icon: Heart, desc: 'Heart and cardiovascular care' },
              { name: 'Pediatrics', icon: Users, desc: 'Child healthcare services' },
              { name: 'Orthopedics', icon: Award, desc: 'Bone and joint treatment' },
            ].map((service) => (
              <div key={service.name} className="card hover:shadow-lg transition">
                <service.icon className="w-12 h-12 text-primary-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                <p className="text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Doctors */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Featured Doctors</h2>
          {loading ? (
            <div className="text-center">Loading...</div>
          ) : featuredDoctors.length === 0 ? (
            <div className="text-center text-gray-500">No featured doctors available</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredDoctors.slice(0, 6).map((doctor) => (
                <div
                  key={doctor._id}
                  className="card hover:shadow-lg transition relative"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <FavoriteButton doctorId={doctor.userId._id} size="md" />
                  </div>
                  <Link to={`/doctors/${doctor.userId._id}`}>
                    <div className="flex items-center space-x-4 mb-4">
                      {doctor.userId.profileImage ? (
                        <img
                          src={doctor.userId.profileImage}
                          alt={doctor.userId.firstName}
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl">
                          {doctor.userId.firstName[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {doctor.userId.firstName} {doctor.userId.lastName}
                        </h3>
                        <p className="text-gray-600">{doctor.specialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">{doctor.rating.toFixed(1)}</span>
                        <span className="text-gray-500 ml-2">({doctor.totalReviews} reviews)</span>
                      </div>
                      <span className="text-primary-500 font-semibold">₹{doctor.consultationFee}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 sm:py-16 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {[
              'Expert medical professionals',
              'Easy online appointment booking',
              '24/7 patient support',
              'Secure medical records',
              'Affordable consultation fees',
              'Modern healthcare technology'
            ].map((feature) => (
              <div key={feature} className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-success-500 flex-shrink-0" />
                <span className="text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

