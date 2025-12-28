import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Star, Clock, Award, Languages, ArrowLeft } from 'lucide-react';
import { doctorService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, TOAST_MESSAGES } from '../constants';
import toast from 'react-hot-toast';
import FavoriteButton from '../components/common/FavoriteButton';

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctorProfile();
    }
  }, [id]);

  const fetchDoctorProfile = async () => {
    try {
      const response = await doctorService.getById(id!);
      setDoctor(response.data.doctor);
      setReviews(response.data.reviews || []);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTOR_PROFILE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-12">
          <p className="text-gray-500">Doctor not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-primary-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back</span>
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Doctor Info */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                {doctor.userId.profileImage ? (
                  <img
                    src={doctor.userId.profileImage}
                    alt={doctor.userId.firstName}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl sm:text-4xl flex-shrink-0">
                    {doctor.userId.firstName[0]}
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                    </h1>
                    <FavoriteButton doctorId={doctor.userId._id} size="lg" />
                  </div>
                  <p className="text-primary-500 text-lg sm:text-xl mb-4">{doctor.specialization}</p>
                  <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="ml-2 font-semibold">{doctor.rating.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">({doctor.totalReviews} reviews)</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Award className="w-5 h-5 mr-2" />
                      {doctor.experience} years experience
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Biography */}
            {doctor.biography && (
              <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">About</h2>
                <p className="text-gray-700">{doctor.biography}</p>
              </div>
            )}

            {/* Education */}
            {doctor.education && doctor.education.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Education</h2>
                <ul className="space-y-3">
                  {doctor.education.map((edu: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <Award className="w-5 h-5 text-primary-500 mr-3 mt-0.5" />
                      <div>
                        <p className="font-semibold">{edu.degree}</p>
                        <p className="text-gray-600">{edu.institution}</p>
                        {edu.year && <p className="text-gray-500 text-sm">{edu.year}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Patient Reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {review.patientId.profileImage ? (
                            <img
                              src={review.patientId.profileImage}
                              alt={review.patientId.firstName}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white mr-3">
                              {review.patientId.firstName[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">
                              {review.patientId.firstName} {review.patientId.lastName}
                            </p>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 mt-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Info */}
          <div>
            <div className="card lg:sticky lg:top-24">
              <h2 className="text-xl font-semibold mb-4">Consultation Details</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-primary-500 mr-3">₹</span>
                  <div>
                    <p className="text-sm text-gray-600">Consultation Fee</p>
                    <p className="font-semibold text-lg">₹{doctor.consultationFee}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-primary-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-semibold">{doctor.consultationDuration} minutes</p>
                  </div>
                </div>
                {doctor.languages && doctor.languages.length > 0 && (
                  <div>
                    <div className="flex items-center mb-2">
                      <Languages className="w-5 h-5 text-primary-500 mr-3" />
                      <p className="text-sm text-gray-600">Languages</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doctor.languages.map((lang: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {user && user.role === USER_ROLES.PATIENT && (
                <Link
                  to={`/book-appointment/${doctor.userId._id}`}
                  className="btn-primary w-full mt-6 text-center block"
                >
                  Book Appointment
                </Link>
              )}
              {!user && (
                <Link
                  to="/login"
                  className="btn-primary w-full mt-6 text-center block"
                >
                  Login to Book
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

