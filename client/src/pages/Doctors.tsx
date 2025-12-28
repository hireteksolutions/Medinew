import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Search, Filter, Star, ArrowLeft } from 'lucide-react';
import { doctorService, specializationService } from '../services/api';
import FavoriteButton from '../components/common/FavoriteButton';

export default function Doctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minRating, setMinRating] = useState('');

  useEffect(() => {
    fetchSpecializations();
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [specialization, minRating]);

  const fetchSpecializations = async () => {
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

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (specialization) params.specialization = specialization;
      if (minRating) params.minRating = minRating;
      if (searchTerm) params.search = searchTerm;

      const response = await doctorService.getAll(params);
      // Ensure response.data is an array
      const doctorsList = Array.isArray(response.data) ? response.data : [];
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDoctors();
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Find a Doctor</h1>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="input-field"
                disabled={loadingSpecializations}
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec._id} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="input-field"
              >
                <option value="">All Ratings</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>
          </div>
          <button onClick={handleSearch} className="btn-primary mt-4">
            Search
          </button>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="text-center py-12">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No doctors found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {doctors.map((doctor) => (
              <div
                key={doctor._id}
                className="card hover:shadow-lg transition relative"
              >
                <div className="absolute top-4 right-4 z-10">
                  <FavoriteButton doctorId={doctor.userId._id} size="md" />
                </div>
                <Link to={`/doctors/${doctor.userId._id}`}>
                  <div className="flex items-start space-x-4 mb-4">
                    {doctor.userId.profileImage ? (
                      <img
                        src={doctor.userId.profileImage}
                        alt={doctor.userId.firstName}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl">
                        {doctor.userId.firstName[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                      </h3>
                      <p className="text-primary-500">{doctor.specialization}</p>
                      <div className="flex items-center mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="ml-1 font-medium">{(doctor.rating || 0).toFixed(1)}</span>
                        <span className="text-gray-500 ml-2">({doctor.totalReviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Experience</p>
                        <p className="font-semibold">{doctor.experience} years</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Consultation Fee</p>
                        <p className="font-semibold text-primary-500">₹{doctor.consultationFee}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

