import { useState, useEffect } from 'react';
import { patientService, appointmentService, reviewService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, X, RefreshCw, Star, MessageSquare, Clock, User, ArrowRight } from 'lucide-react';
import { APPOINTMENT_STATUSES, APPOINTMENT_FILTERS, getAppointmentStatusColor, canCancelAppointment, TOAST_MESSAGES } from '../../constants';
import Badge from '../../components/common/Badge';

export default function Appointments() {
  const { showLoader, hideLoader } = useLoader();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState<typeof APPOINTMENT_FILTERS[keyof typeof APPOINTMENT_FILTERS]>(APPOINTMENT_FILTERS.ALL);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      showLoader('Loading appointments...');
      const params: any = {};
      if (filter === APPOINTMENT_FILTERS.UPCOMING) {
        params.upcoming = 'true';
      } else if (filter === APPOINTMENT_FILTERS.PAST) {
        params.status = APPOINTMENT_STATUSES.COMPLETED;
      }
      const response = await patientService.getAppointments(params);
      setAppointments(response.data);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_APPOINTMENTS_FAILED);
    } finally {
      setLoading(false);
      hideLoader();
    }
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">Manage and track all your appointments</p>
        </div>
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

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No appointments found</p>
          <p className="text-gray-400 text-sm">Start by booking your first appointment</p>
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
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span className="text-xs">{appointment.timeSlot.start} - {appointment.timeSlot.end}</span>
                          </div>
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
                      <Badge variant={
                        appointment.status === APPOINTMENT_STATUSES.CONFIRMED ? 'success' :
                        appointment.status === APPOINTMENT_STATUSES.COMPLETED ? 'info' :
                        appointment.status === APPOINTMENT_STATUSES.CANCELLED ? 'danger' :
                        'warning'
                      }>
                        {appointment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {checkCanReview(appointment) && (
                          <button
                            onClick={() => handleReviewClick(appointment)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                            title="Review & Rate"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        )}
                        {canCancelAppointment(appointment.status) && (
                          <button
                            onClick={() => handleCancel(appointment._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            title="Cancel Appointment"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

