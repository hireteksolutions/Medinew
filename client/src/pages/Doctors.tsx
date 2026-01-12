import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { 
  Search, 
  Filter, 
  Star, 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Award, 
  CheckCircle, 
  Share2, 
  Eye,
  Navigation,
  X,
  SlidersHorizontal,
  DollarSign,
  Calendar,
  Radio
} from 'lucide-react';
import { doctorService, specializationService } from '../services/api';
import FavoriteButton from '../components/common/FavoriteButton';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

export default function Doctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minRating, setMinRating] = useState('');
  const [consultationType, setConsultationType] = useState('all');
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [availability, setAvailability] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  
  // Location states
  const [locationInput, setLocationInput] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState('50'); // Default 50km
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(12);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 12,
    offset: 0,
    page: 1,
    pages: 0
  });

  useEffect(() => {
    fetchSpecializations();
    fetchDoctors();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setOffset(0);
  }, [specialization, minRating, searchTerm, consultationType, minFee, maxFee, availability, sortBy, userLocation, radius]);

  useEffect(() => {
    fetchDoctors();
  }, [specialization, minRating, offset, consultationType, minFee, maxFee, availability, sortBy, userLocation, radius]);

  const fetchSpecializations = async () => {
    try {
      const response = await specializationService.getAll();
      const specializationsList = Array.isArray(response.data) ? response.data : [];
      setSpecializations(specializationsList);
    } catch (error) {
      setSpecializations([]);
    } finally {
      setLoadingSpecializations(false);
    }
  };

  // Get user's current location using GPS
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationInput(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        toast.success('Location detected successfully!');
        setLoadingLocation(false);
      },
      (error) => {
        toast.error('Unable to get your location. Please enter it manually.');
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Geocode location input (simple implementation - can be enhanced with Google Maps API)
  const handleLocationInput = async () => {
    if (!locationInput.trim()) {
      setUserLocation(null);
      return;
    }

    // Check if input is coordinates
    const coordMatch = locationInput.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setUserLocation({ lat, lng });
        toast.success('Location set successfully!');
        return;
      }
    }

    // For city/address names, you would typically use a geocoding service
    // For now, we'll show a message
    toast.error('Please enter coordinates (lat, lng) or use GPS detection');
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: any = {
        offset: offset,
        limit: limit
      };
      
      if (specialization) params.specialization = specialization;
      if (minRating) params.minRating = minRating;
      if (searchTerm) params.search = searchTerm;
      if (consultationType && consultationType !== 'all') params.consultationType = consultationType;
      if (minFee) params.minFee = minFee;
      if (maxFee) params.maxFee = maxFee;
      if (availability) params.availability = availability;
      if (sortBy) params.sortBy = sortBy;
      
      // Location parameters
      if (userLocation) {
        params.latitude = userLocation.lat;
        params.longitude = userLocation.lng;
        if (radius) params.radius = radius;
      }

      const response = await doctorService.getAll(params);
      const doctorsData = response.data?.doctors || response.data || [];
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      } else if (Array.isArray(response.data)) {
        // Fallback for old API format
        setPagination({
          total: response.data.length,
          limit: limit,
          offset: offset,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(response.data.length / limit)
        });
      }
    } catch (error) {
      setDoctors([]);
      toast.error('Failed to fetch doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    fetchDoctors();
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSpecialization('');
    setMinRating('');
    setConsultationType('all');
    setMinFee('');
    setMaxFee('');
    setAvailability('');
    setSortBy('rating');
    setUserLocation(null);
    setLocationInput('');
    setRadius('50');
    setOffset(0);
  };

  const handleShare = async (doctor: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const doctorName = `Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}`;
    const doctorUrl = `${window.location.origin}/doctors/${doctor.userId._id}`;
    const shareText = `Check out ${doctorName} - ${doctor.specialization} on MediNew! ${doctorUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${doctorName} - ${doctor.specialization}`,
          text: shareText,
          url: doctorUrl,
        });
        toast.success('Doctor profile shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          copyToClipboard(doctorUrl, doctorName);
        }
      }
    } else {
      copyToClipboard(doctorUrl, doctorName);
    }
  };

  const copyToClipboard = (url: string, doctorName: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(`Link to ${doctorName}'s profile copied to clipboard!`);
    }).catch(() => {
      toast.error('Failed to copy link. Please try again.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-medical-600 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Find Your Doctor
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-2xl">
            Connect with experienced healthcare professionals near you
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Search and Filters - Enhanced */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">Search & Filter</h2>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">{showAdvancedFilters ? 'Hide' : 'Show'} Advanced</span>
            </button>
          </div>
          
          {/* Basic Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-field pl-12 h-12 text-base"
                />
              </div>
            </div>
            <div>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="input-field h-12 text-base"
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
                className="input-field h-12 text-base"
              >
                <option value="">All Ratings</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>
          </div>

          {/* Location Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Enter location (city, state) or coordinates (lat, lng)"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLocationInput()}
                  className="input-field pl-12 h-12 text-base"
                />
                {userLocation && (
                  <button
                    onClick={() => {
                      setUserLocation(null);
                      setLocationInput('');
                    }}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={getCurrentLocation}
                disabled={loadingLocation}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Navigation className="w-5 h-5" />
                <span className="hidden sm:inline">{loadingLocation ? 'Detecting...' : 'Use GPS'}</span>
              </button>
              {userLocation && (
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-24 input-field h-12 text-base"
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="200">200 km</option>
                </select>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Consultation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Radio className="w-4 h-4 inline mr-1" />
                    Consultation Type
                  </label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    className="input-field h-12 text-base w-full"
                  >
                    <option value="all">All Types</option>
                    <option value="online">Online Only</option>
                    <option value="offline">Offline Only</option>
                    <option value="both">Both Available</option>
                  </select>
                </div>

                {/* Fee Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Min Fee (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minFee}
                    onChange={(e) => setMinFee(e.target.value)}
                    className="input-field h-12 text-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Fee (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxFee}
                    onChange={(e) => setMaxFee(e.target.value)}
                    className="input-field h-12 text-base w-full"
                  />
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Availability
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="input-field h-12 text-base w-full"
                  >
                    <option value="">All</option>
                    <option value="today">Available Today</option>
                    <option value="thisWeek">Available This Week</option>
                    <option value="available">Currently Available</option>
                  </select>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'distance', label: 'Nearest First' },
                    { value: 'fee', label: 'Lowest Fee' },
                    { value: 'experience', label: 'Most Experience' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button 
              onClick={handleSearch} 
              className="flex-1 sm:flex-initial bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>Search Doctors</span>
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        {!loading && doctors.length > 0 && (
          <div className="mb-6 text-gray-600">
            <span className="font-semibold text-gray-900">{pagination.total || doctors.length}</span> doctor{doctors.length !== 1 ? 's' : ''} found
            {userLocation && (
              <span className="ml-2 text-sm text-primary-600">
                within {radius} km of your location
              </span>
            )}
          </div>
        )}

        {/* Doctors Grid - Enhanced */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-md">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search criteria or location</p>
            <button
              onClick={clearFilters}
              className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {doctors.map((doctor) => (
              <div
                key={doctor._id}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  <button
                    onClick={(e) => handleShare(doctor, e)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 text-gray-600"
                    title="Share doctor profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <FavoriteButton doctorId={doctor.userId._id} size="md" />
                </div>
                
                <div className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    {doctor.userId.profileImage ? (
                      <img
                        src={doctor.userId.profileImage}
                        alt={doctor.userId.firstName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 group-hover:border-primary-300 transition-colors flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary-100 group-hover:border-primary-300 transition-colors flex-shrink-0">
                        {doctor.userId.firstName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                        Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                      </h3>
                      <div className="flex items-center text-primary-600 font-medium text-sm mb-2">
                        <Award className="w-4 h-4 mr-1" />
                        <span>{doctor.specialization}</span>
                      </div>
                      {doctor.currentHospitalName && (
                        <div className="text-gray-600 text-xs mb-2 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="truncate">{doctor.currentHospitalName}</span>
                        </div>
                      )}
                      {doctor.education && doctor.education.length > 0 && doctor.education[0] && (
                        <div className="text-gray-600 text-xs mb-2 flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          <span className="truncate">
                            {doctor.education[0].degree}
                            {doctor.education[0].institution && ` - ${doctor.education[0].institution}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="ml-1 font-semibold text-gray-900">{(doctor.rating || 0).toFixed(1)}</span>
                        <span className="text-gray-500 ml-2 text-sm">({doctor.totalReviews || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Distance Display */}
                  {doctor.distanceFormatted && (
                    <div className="mb-3 flex items-center text-primary-600 text-sm font-medium">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{doctor.distanceFormatted} away</span>
                    </div>
                  )}

                  {/* Consultation Type Badge */}
                  {doctor.consultationType && Array.isArray(doctor.consultationType) && doctor.consultationType.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(doctor.consultationType.includes('online') || doctor.consultationType.includes('both')) && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Online
                        </span>
                      )}
                      {(doctor.consultationType.includes('offline') || doctor.consultationType.includes('both')) && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Offline
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm">Experience</span>
                      </div>
                      <span className="font-semibold text-gray-900">{doctor.experience || 'N/A'} years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">Consultation Fee</span>
                      </div>
                      <span className="font-bold text-primary-600 text-lg">₹{doctor.consultationFee}</span>
                    </div>
                    {doctor.userId.address && (doctor.userId.address.city || doctor.userId.address.state) && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>
                          {[doctor.userId.address.city, doctor.userId.address.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      to={`/doctors/${doctor.userId._id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Profile</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {!loading && doctors.length > 0 && pagination.total > 0 && (
          <div className="mt-12">
            <Pagination
              total={pagination.total}
              limit={pagination.limit || limit}
              offset={pagination.offset || offset}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
