import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService, appointmentService, reviewService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, X, Star, Clock, MoreVertical, IndianRupee, Plus, Stethoscope, Heart, ArrowRight, Sparkles } from 'lucide-react';
import { APPOINTMENT_STATUSES, APPOINTMENT_FILTERS, canCancelAppointment, TOAST_MESSAGES } from '../../constants';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { getAppointmentBadgeVariant, toTitleCase } from '../../utils/badgeUtils';

export default function Appointments() {
  const { showLoader, hideLoader } = useLoader();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState<typeof APPOINTMENT_FILTERS[keyof typeof APPOINTMENT_FILTERS]>(APPOINTMENT_FILTERS.ALL);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navigate = useNavigate();
  const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [recentDoctors, setRecentDoctors] = useState<any[]>([]);
  const [showQuickBook, setShowQuickBook] = useState(true);
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(5);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 5,
    offset: 0,
    page: 1,
    pages: 0
  });

  // Reset to first page when filter changes
  useEffect(() => {
    setOffset(0);
  }, [filter]);

  useEffect(() => {
    fetchAppointments();
  }, [filter, offset]);

  useEffect(() => {
    fetchFavoriteDoctors();
    extractRecentDoctors();
  }, []);

  useEffect(() => {
    // Update recent doctors when appointments change
    extractRecentDoctors();
  }, [appointments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && dropdownRefs.current[openDropdownId]) {
        if (!dropdownRefs.current[openDropdownId]?.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      showLoader('Loading appointments...');
      const params: any = { 
        offset: offset,
        limit: limit
      };
      if (filter === APPOINTMENT_FILTERS.UPCOMING) {
        params.upcoming = 'true';
      } else if (filter === APPOINTMENT_FILTERS.PAST) {
        params.status = APPOINTMENT_STATUSES.COMPLETED;
      }
      const response = await patientService.getAppointments(params);
      // Handle paginated response structure: { appointments: [...], pagination: {...} }
      const appointmentsData = response.data?.appointments || response.data || [];
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_APPOINTMENTS_FAILED);
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      showLoader('Cancelling appointment...');
      await appointmentService.cancel(id);
      toast.success(TOAST_MESSAGES.APPOINTMENT_CANCELLED_SUCCESS);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.APPOINTMENT_CANCEL_FAILED);
      hideLoader();
    }
  };

  const handleReviewClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAppointment) return;

    try {
      showLoader('Submitting review...');
      await reviewService.create({
        appointmentId: selectedAppointment._id,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      hideLoader();
    }
  };

  const checkCanReview = (appointment: any) => {
    // Only allow review for completed appointments
    // Backend will prevent duplicate reviews
    return appointment.status === APPOINTMENT_STATUSES.COMPLETED;
  };

  const needsPayment = (appointment: any) => {
    // Check if payment is pending or not completed
    return appointment.paymentStatus === 'pending' || 
           appointment.paymentStatus === 'Pending' ||
           (!appointment.paymentStatus && appointment.status !== APPOINTMENT_STATUSES.CANCELLED);
  };

  const handlePayment = (appointmentId: string) => {
    navigate(`/payment/${appointmentId}`);
  };

  const hasActions = (appointment: any) => {
    // Check if there are any available actions for this appointment
    return needsPayment(appointment) || 
           checkCanReview(appointment) || 
           canCancelAppointment(appointment.status);
  };

  const fetchFavoriteDoctors = async () => {
    try {
      setLoadingFavorites(true);
      const response = await patientService.getFavoriteDoctors();
      const doctorsData = response.data?.doctors || response.data || [];
      setFavoriteDoctors(Array.isArray(doctorsData) ? doctorsData.slice(0, 3) : []);
    } catch (error) {
      console.error('Error fetching favorite doctors:', error);
      setFavoriteDoctors([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const extractRecentDoctors = () => {
    // Extract unique doctors from recent appointments
    const doctorMap = new Map();
    appointments.forEach((appointment: any) => {
      if (appointment.doctorId && appointment.doctorId._id) {
        const doctorId = appointment.doctorId._id;
        if (!doctorMap.has(doctorId)) {
          doctorMap.set(doctorId, {
            ...appointment.doctorId,
            lastAppointmentDate: appointment.appointmentDate
          });
        }
      }
    });
    const recent = Array.from(doctorMap.values())
      .sort((a: any, b: any) => 
        new Date(b.lastAppointmentDate).getTime() - new Date(a.lastAppointmentDate).getTime()
      )
      .slice(0, 3);
    setRecentDoctors(recent);
  };

  const handleBookAppointment = (doctorId?: string) => {
    if (doctorId) {
      navigate(`/book-appointment/${doctorId}`);
    } else {
      navigate('/book-appointment');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">Manage and track all your appointments</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => handleBookAppointment()}
            className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Book New Appointment</span>
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter(APPOINTMENT_FILTERS.ALL)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === APPOINTMENT_FILTERS.ALL 
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter(APPOINTMENT_FILTERS.UPCOMING)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === APPOINTMENT_FILTERS.UPCOMING 
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter(APPOINTMENT_FILTERS.PAST)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === APPOINTMENT_FILTERS.PAST 
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Past
            </button>
          </div>
        </div>
      </div>

      {/* Quick Book Section */}
      {(favoriteDoctors.length > 0 || recentDoctors.length > 0) && showQuickBook && (
        <div className="card mb-6 bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">Quick Book</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBookAppointment()}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View All Doctors
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowQuickBook(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close Quick Book"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Favorite Doctors */}
            {favoriteDoctors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-gray-700">Book with Favorite Doctor</h3>
                </div>
                <div className="space-y-2">
                  {favoriteDoctors.map((doctor: any) => (
                    <button
                      key={doctor._id || doctor.userId?._id}
                      onClick={() => handleBookAppointment(doctor.userId?._id || doctor._id)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        {doctor.userId?.profileImage ? (
                          <img
                            src={doctor.userId.profileImage}
                            alt={doctor.userId.firstName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                            {doctor.userId?.firstName?.[0] || 'D'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            Dr. {doctor.userId?.firstName || doctor.firstName} {doctor.userId?.lastName || doctor.lastName}
                          </div>
                          <div className="text-xs text-primary-600">{doctor.specialization}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Doctors */}
            {recentDoctors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <h3 className="font-semibold text-gray-700">Book with Recent Doctor</h3>
                </div>
                <div className="space-y-2">
                  {recentDoctors.map((doctor: any) => (
                    <button
                      key={doctor._id}
                      onClick={() => handleBookAppointment(doctor._id)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        {doctor.profileImage ? (
                          <img
                            src={doctor.profileImage}
                            alt={doctor.firstName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                            {doctor.firstName?.[0] || 'D'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            Dr. {doctor.firstName} {doctor.lastName}
                          </div>
                          <div className="text-xs text-primary-600">{doctor.specialization}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-6">
              {filter === APPOINTMENT_FILTERS.UPCOMING 
                ? "You don't have any upcoming appointments"
                : filter === APPOINTMENT_FILTERS.PAST
                ? "You don't have any past appointments"
                : "Start by booking your first appointment"}
            </p>
            <button
              onClick={() => handleBookAppointment()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Book Your First Appointment</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Appointment ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {appointment.doctorId.profileImage ? (
                          <img
                            src={appointment.doctorId.profileImage}
                            alt={appointment.doctorId.firstName}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {appointment.doctorId.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Dr. {appointment.doctorId.firstName} {appointment.doctorId.lastName}
                          </div>
                          {appointment.reasonForVisit && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {appointment.reasonForVisit}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center font-medium">
                          <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                          <span>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-gray-500 mt-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary-500 mr-1.5 flex-shrink-0" />
                          <span className="text-xs">{appointment.timeSlot.start} - {appointment.timeSlot.end}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary-600 font-medium">
                        {appointment.doctorId.specialization}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono text-xs">
                        {appointment.appointmentNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getAppointmentBadgeVariant(appointment.status)}>
                        {toTitleCase(appointment.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasActions(appointment) ? (
                        <div className="relative" ref={(el) => (dropdownRefs.current[appointment._id] = el)} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === appointment._id ? null : appointment._id)}
                            className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openDropdownId === appointment._id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                              {needsPayment(appointment) && (
                                <button
                                  onClick={() => {
                                    handlePayment(appointment._id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <IndianRupee className="w-4 h-4" />
                                  <span>Pay Now</span>
                                </button>
                              )}
                              {checkCanReview(appointment) && (
                                <button
                                  onClick={() => {
                                    handleReviewClick(appointment);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Star className="w-4 h-4" />
                                  <span>Review</span>
                                </button>
                              )}
                              {canCancelAppointment(appointment.status) && (
                                <button
                                  onClick={() => {
                                    handleCancel(appointment._id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination.total > 0 && (
            <Pagination
              total={pagination.total}
              limit={pagination.limit || limit}
              offset={pagination.offset || offset}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Rate Your Experience</h2>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Dr. {selectedAppointment.doctorId.firstName} {selectedAppointment.doctorId.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Appointment Date: {format(new Date(selectedAppointment.appointmentDate), 'MMMM d, yyyy')}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setReviewRating(rating)}
                    className={`p-2 rounded ${
                      rating <= reviewRating
                        ? 'text-yellow-500 bg-yellow-50'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${rating <= reviewRating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment (Optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                className="flex-1 btn-primary"
              >
                Submit Review
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

