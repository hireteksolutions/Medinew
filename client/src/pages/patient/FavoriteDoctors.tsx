import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/api';
import { Star, Heart, MapPin, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { TOAST_MESSAGES } from '../../constants';

export default function FavoriteDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoriteDoctors();
  }, []);

  const fetchFavoriteDoctors = async () => {
    try {
      const response = await patientService.getFavoriteDoctors();
      // Backend returns { doctors, pagination }, so we need to extract the doctors array
      const doctorsData = response.data?.doctors || response.data || [];
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
    } catch (error) {
      console.error('Error fetching favorite doctors:', error);
      setDoctors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (doctorId: string) => {
    try {
      await patientService.removeFavoriteDoctor(doctorId);
      toast.success(TOAST_MESSAGES.REMOVED_FROM_FAVORITES);
      fetchFavoriteDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.REMOVE_FROM_FAVORITES_FAILED);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Favorite Doctors</h1>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : doctors.length === 0 ? (
        <div className="card text-center py-12">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No favorite doctors yet</p>
          <Link to="/doctors" className="text-primary-500 hover:underline">
            Browse doctors
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(doctors) && doctors.map((doctor) => (
            <div key={doctor._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {doctor.userId.profileImage ? (
                    <img
                      src={doctor.userId.profileImage}
                      alt={doctor.userId.firstName}
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl">
                      {doctor.userId.firstName[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link
                      to={`/doctors/${doctor.userId._id}`}
                      className="text-xl font-semibold hover:text-primary-500"
                    >
                      Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                    </Link>
                    <p className="text-primary-500 mb-1">{doctor.specialization}</p>
                    {doctor.currentHospitalName && (
                      <p className="text-gray-600 text-sm mb-1 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate">{doctor.currentHospitalName}</span>
                      </p>
                    )}
                    {doctor.education && doctor.education.length > 0 && doctor.education[0] && (
                      <p className="text-gray-600 text-sm mb-2 flex items-center">
                        <Award className="w-3 h-3 mr-1" />
                        <span className="truncate">
                          {doctor.education[0].degree}
                          {doctor.education[0].institution && ` - ${doctor.education[0].institution}`}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 font-medium">{doctor.rating.toFixed(1)}</span>
                      <span className="text-gray-500 ml-2">({doctor.totalReviews} reviews)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(doctor.userId?._id || doctor._id)}
                  className="text-danger-500 hover:text-danger-600"
                >
                  <Heart className="w-6 h-6 fill-current" />
                </button>
              </div>
              <div className="mt-4">
                <Link
                  to={`/book-appointment/${doctor.userId._id}`}
                  className="btn-primary w-full text-center block"
                >
                  Book Appointment
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

