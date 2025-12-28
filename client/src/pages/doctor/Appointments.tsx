import { useState, useEffect, useRef } from 'react';
import { doctorDashboardService, paymentService } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, X, User, Phone, Mail, MapPin, Calendar as CalendarIcon, Droplet, AlertCircle, Pill, Heart, Activity, PhoneCall, FileText, Clock, Eye, Search, Filter, CreditCard, IndianRupee, MoreVertical, Scale, Ruler } from 'lucide-react';
import DatePickerComponent from '../../components/common/DatePicker';
import { APPOINTMENT_STATUSES, getAppointmentStatusColor, isActiveAppointment, TOAST_MESSAGES, APPOINTMENT_FILTERS } from '../../constants';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [markingPayment, setMarkingPayment] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(5); // 5 records per page
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 5,
    offset: 0,
    page: 1,
    pages: 0
  });

  // Reset to first page when filters change
  useEffect(() => {
    setOffset(0);
  }, [selectedDate, filter]);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, filter, offset]);

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
      const params: any = { 
        date: selectedDate,
        offset: offset,
        limit: limit
      };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await doctorDashboardService.getAppointments(params);
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
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredAppointments = appointments.filter((appointment) => {
    if (!searchTerm) return true;
    if (!appointment.patientId) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.patientId.firstName?.toLowerCase().includes(searchLower) ||
      appointment.patientId.lastName?.toLowerCase().includes(searchLower) ||
      appointment.patientId.email?.toLowerCase().includes(searchLower) ||
      appointment.appointmentNumber?.toLowerCase().includes(searchLower)
    );
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await doctorDashboardService.updateAppointment(id, { status });
      toast.success(TOAST_MESSAGES.APPOINTMENT_UPDATED_SUCCESS);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.APPOINTMENT_UPDATE_FAILED);
    }
  };

  const handleMarkPaymentPaid = async () => {
    if (!selectedAppointment?.payment) {
      toast.error('Payment information not found');
      return;
    }

    if (paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setMarkingPayment(true);
    try {
      const updateData = {
        status: 'completed',
        transactionId: `OFFLINE-${Date.now()}`,
      };

      // If amount is different from expected, we still update with the entered amount
      if (!selectedAppointment.payment?._id) {
        toast.error('Payment record not found');
        return;
      }
      await paymentService.updateStatus(selectedAppointment.payment._id, updateData);
      toast.success('Payment marked as completed successfully');
      setShowPaymentModal(false);
      setPaymentAmount(0);
      fetchAppointments();
      setSelectedAppointment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark payment as paid');
    } finally {
      setMarkingPayment(false);
    }
  };

  const getPaymentStatusBadge = (payment: any) => {
    if (!payment) {
      return (
        <Badge variant="secondary">
          No Payment
        </Badge>
      );
    }

    const status = payment.status;
    const gateway = payment.paymentGateway;

    let statusText = status.charAt(0).toUpperCase() + status.slice(1);
    if (gateway === 'offline' && status === 'pending') {
      statusText = 'Pay at Clinic';
    } else if (status === 'completed') {
      statusText = 'Completed';
    }

    const statusVariants: { [key: string]: 'success' | 'warning' | 'danger' | 'secondary' | 'info' } = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      cancelled: 'secondary',
      refunded: 'warning',
      processing: 'info',
    };

    return (
      <Badge variant={statusVariants[status] || 'secondary'}>
        {statusText}
      </Badge>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">Manage and track all your patient appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <DatePickerComponent
              selected={selectedDate ? new Date(selectedDate) : new Date()}
              onChange={(date) => {
                if (date) {
                  setSelectedDate(format(date, 'yyyy-MM-dd'));
                }
              }}
              placeholderText="Select date"
              dateFormat="MM/dd/yyyy"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by patient name, email, or appointment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-primary-500 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter(APPOINTMENT_STATUSES.PENDING)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === APPOINTMENT_STATUSES.PENDING 
                    ? 'bg-primary-500 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter(APPOINTMENT_STATUSES.CONFIRMED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === APPOINTMENT_STATUSES.CONFIRMED 
                    ? 'bg-primary-500 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setFilter(APPOINTMENT_STATUSES.COMPLETED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === APPOINTMENT_STATUSES.COMPLETED 
                    ? 'bg-primary-500 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No appointments found</p>
          <p className="text-gray-400 text-sm">
            {searchTerm ? 'Try adjusting your search or filters' : 'No appointments scheduled for this date'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Appointment ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Amount</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.filter(appointment => appointment?.patientId != null).map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {appointment.patientId && appointment.patientId?.profileImage ? (
                          <img
                            src={appointment.patientId?.profileImage}
                            alt={appointment.patientId?.firstName || 'Patient'}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {appointment.patientId?.firstName?.[0] || 'P'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {appointment.patientId ? `${appointment.patientId.firstName || ''} ${appointment.patientId.lastName || ''}`.trim() : 'Unknown Patient'}
                          </div>
                          {appointment.symptoms && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {appointment.symptoms}
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
                          <span className="text-xs">{appointment.timeSlot?.start || 'N/A'} - {appointment.timeSlot?.end || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{appointment.patientId?.email || 'N/A'}</span>
                        </div>
                        {appointment.patientId?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-xs">{appointment.patientId.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono text-xs">
                        {appointment.appointmentNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {appointment.reasonForVisit || 'N/A'}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(appointment.payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.payment ? (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-900">{appointment.payment?.amount || appointment?.consultationFee || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                            <button
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            {/* Only show other actions if payment is not completed or status is not completed */}
                            {!(appointment.payment?.status === 'completed' && appointment.status === APPOINTMENT_STATUSES.COMPLETED) && (
                              <>
                                {appointment.payment && 
                                 appointment.payment.paymentGateway === 'offline' && 
                                 appointment.payment.status === 'pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAppointment(appointment);
                                      setPaymentAmount(appointment.payment?.amount || appointment.consultationFee || 0);
                                      setShowPaymentModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                  >
                                    <IndianRupee className="w-4 h-4" />
                                    <span>Mark Payment Paid</span>
                                  </button>
                                )}
                                {isActiveAppointment(appointment.status) && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(appointment._id, APPOINTMENT_STATUSES.COMPLETED);
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Complete</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(appointment._id, APPOINTMENT_STATUSES.CANCELLED);
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                      <span>Cancel</span>
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
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

      {/* Patient Details Modal */}
      {selectedAppointment && selectedAppointment.patientId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Patient Details</h2>
                  <p className="text-primary-100 text-sm">Appointment Information</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(95vh-80px)]">
              {/* Patient Basic Info */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                    {selectedAppointment.patientId?.profileImage ? (
                      <img
                        src={selectedAppointment.patientId?.profileImage || ''}
                        alt={selectedAppointment.patientId?.firstName || 'Patient'}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                        {selectedAppointment.patientId?.firstName?.[0] || 'P'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        {selectedAppointment.patientId ? `${selectedAppointment.patientId.firstName || ''} ${selectedAppointment.patientId.lastName || ''}`.trim() : 'Unknown Patient'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-primary-500" />
                          <span className="text-sm">{selectedAppointment.patientId?.email || 'N/A'}</span>
                        </div>
                        {selectedAppointment.patientId?.phone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-primary-500" />
                            <span className="text-sm">{selectedAppointment.patientId.phone}</span>
                          </div>
                        )}
                        {selectedAppointment.patientId?.dateOfBirth && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <CalendarIcon className="w-4 h-4 text-primary-500" />
                            <span className="text-sm">DOB: {format(new Date(selectedAppointment.patientId.dateOfBirth), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {selectedAppointment.patientId?.gender && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-primary-500" />
                            <span className="text-sm capitalize">{selectedAppointment.patientId.gender}</span>
                          </div>
                        )}
                        {selectedAppointment.patientId?.address && (
                          <div className="flex items-start gap-2 text-gray-700 sm:col-span-2">
                            <MapPin className="w-4 h-4 text-primary-500 mt-0.5" />
                            <span className="text-sm">
                              {[
                                selectedAppointment.patientId.address.street,
                                selectedAppointment.patientId.address.city,
                                selectedAppointment.patientId.address.state,
                                selectedAppointment.patientId.address.zipCode
                              ].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BMI Information */}
                  {(selectedAppointment.height || selectedAppointment.weight || selectedAppointment.bmi) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-primary-500" />
                        Body Mass Index (BMI)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {selectedAppointment.height && (
                          <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Ruler className="w-4 h-4 text-blue-500" />
                              <p className="text-sm font-medium text-gray-600">Height</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{selectedAppointment.height} cm</p>
                          </div>
                        )}
                        {selectedAppointment.weight && (
                          <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Scale className="w-4 h-4 text-green-500" />
                              <p className="text-sm font-medium text-gray-600">Weight</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{selectedAppointment.weight} kg</p>
                          </div>
                        )}
                        {selectedAppointment.bmi && (
                          <div className="bg-gradient-to-br from-primary-50 to-indigo-50 rounded-xl p-4 border-2 border-primary-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-primary-600" />
                              <p className="text-sm font-semibold text-primary-700">BMI</p>
                            </div>
                            <p className="text-3xl font-bold text-primary-600">{selectedAppointment.bmi.toFixed(1)}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedAppointment.bmi < 18.5 ? 'Underweight' :
                               selectedAppointment.bmi < 25 ? 'Normal' :
                               selectedAppointment.bmi < 30 ? 'Overweight' : 'Obese'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div className="mb-8">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                  <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-500" />
                    Appointment Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Date</p>
                        <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedAppointment.appointmentDate), 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Time Slot</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedAppointment.timeSlot.start} - {selectedAppointment.timeSlot.end}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Status</p>
                        <Badge variant={
                          selectedAppointment.status === APPOINTMENT_STATUSES.CONFIRMED ? 'success' :
                          selectedAppointment.status === APPOINTMENT_STATUSES.COMPLETED ? 'info' :
                          selectedAppointment.status === APPOINTMENT_STATUSES.CANCELLED ? 'danger' :
                          'warning'
                        }>
                          {selectedAppointment.status}
                        </Badge>
                      </div>
                    </div>
                    {selectedAppointment.appointmentNumber && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Appointment ID</p>
                          <p className="text-sm font-semibold text-gray-900 font-mono">{selectedAppointment.appointmentNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedAppointment.reasonForVisit && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Reason for Visit</p>
                      <p className="text-sm text-gray-800">{selectedAppointment.reasonForVisit}</p>
                    </div>
                  )}
                  {selectedAppointment.symptoms && (
                    <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Symptoms</p>
                      <p className="text-sm text-gray-800">{selectedAppointment.symptoms}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-8">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                  <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-500" />
                    Payment Information
                  </h4>
                  {selectedAppointment.payment ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Payment Status</p>
                        <div>{getPaymentStatusBadge(selectedAppointment.payment)}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Amount</p>
                        <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                          <IndianRupee className="w-6 h-6" />
                          {selectedAppointment.payment?.amount || selectedAppointment.consultationFee || 'N/A'}
                        </p>
                      </div>
                      {selectedAppointment.payment && (
                        <>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">Payment Method</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">{selectedAppointment.payment.paymentMethod?.replace('_', ' ') || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">Payment Type</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">
                              {selectedAppointment.payment.paymentGateway === 'offline' ? 'Pay at Clinic' : 'Online Payment'}
                            </p>
                          </div>
                          {selectedAppointment.payment.transactionId && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 sm:col-span-2">
                              <p className="text-xs font-medium text-gray-600 mb-2">Transaction ID</p>
                              <p className="text-sm font-semibold text-gray-900 font-mono">{selectedAppointment.payment.transactionId}</p>
                            </div>
                          )}
                          {selectedAppointment.payment.paidAt && (
                            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 sm:col-span-2">
                              <p className="text-xs font-medium text-gray-600 mb-2">Paid At</p>
                              <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedAppointment.payment.paidAt), 'MMMM d, yyyy HH:mm')}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 font-medium">No payment information available for this appointment.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Profile Details */}
              {selectedAppointment.patientProfile && (
                <div className="space-y-6">
                  {/* Blood Group */}
                  {selectedAppointment.patientProfile.bloodGroup && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-red-500" />
                        Blood Group
                      </h4>
                      <div className="inline-block px-4 py-2 bg-red-50 border-2 border-red-200 rounded-lg">
                        <p className="text-xl font-bold text-red-600">{selectedAppointment.patientProfile.bloodGroup}</p>
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {selectedAppointment.patientProfile.allergies && selectedAppointment.patientProfile.allergies.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Allergies
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAppointment.patientProfile.allergies.map((allergy: string, index: number) => (
                          <span key={index} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium border border-red-200">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Medications */}
                  {selectedAppointment.patientProfile.currentMedications && selectedAppointment.patientProfile.currentMedications.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Pill className="w-5 h-5 text-blue-500" />
                        Current Medications
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.currentMedications.map((med: any, index: number) => (
                          <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="font-semibold text-gray-900 mb-2">{med.name}</p>
                            <div className="space-y-1">
                              {med.dosage && <p className="text-sm text-gray-600">Dosage: <span className="font-medium">{med.dosage}</span></p>}
                              {med.frequency && <p className="text-sm text-gray-600">Frequency: <span className="font-medium">{med.frequency}</span></p>}
                              {med.prescribedBy && <p className="text-sm text-gray-600">Prescribed by: <span className="font-medium">{med.prescribedBy}</span></p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medical History */}
                  {selectedAppointment.patientProfile.medicalHistory && selectedAppointment.patientProfile.medicalHistory.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-500" />
                        Medical History
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.medicalHistory.map((history: any, index: number) => (
                          <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <p className="font-semibold text-gray-900 mb-2">{history.condition}</p>
                            {history.diagnosisDate && (
                              <p className="text-sm text-gray-600 mb-1">
                                Diagnosed: <span className="font-medium">{format(new Date(history.diagnosisDate), 'MMMM d, yyyy')}</span>
                              </p>
                            )}
                            {history.notes && <p className="text-sm text-gray-700 mt-2">{history.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chronic Conditions */}
                  {selectedAppointment.patientProfile.chronicConditions && selectedAppointment.patientProfile.chronicConditions.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Chronic Conditions
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.chronicConditions.map((condition: any, index: number) => (
                          <div key={index} className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900">{condition.condition}</p>
                              {condition.severity && (
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                  condition.severity === 'severe' ? 'bg-red-200 text-red-800' :
                                  condition.severity === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-green-200 text-green-800'
                                }`}>
                                  {condition.severity}
                                </span>
                              )}
                            </div>
                            {condition.diagnosisDate && (
                              <p className="text-sm text-gray-600 mb-1">
                                Diagnosed: <span className="font-medium">{format(new Date(condition.diagnosisDate), 'MMMM d, yyyy')}</span>
                              </p>
                            )}
                            {condition.notes && <p className="text-sm text-gray-700 mt-2">{condition.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Surgeries */}
                  {selectedAppointment.patientProfile.previousSurgeries && selectedAppointment.patientProfile.previousSurgeries.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        Previous Surgeries
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.previousSurgeries.map((surgery: any, index: number) => (
                          <div key={index} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <p className="font-semibold text-gray-900 mb-2">{surgery.surgeryType}</p>
                            <div className="space-y-1">
                              {surgery.date && (
                                <p className="text-sm text-gray-600">
                                  Date: <span className="font-medium">{format(new Date(surgery.date), 'MMMM d, yyyy')}</span>
                                </p>
                              )}
                              {surgery.hospital && <p className="text-sm text-gray-600">Hospital: <span className="font-medium">{surgery.hospital}</span></p>}
                              {surgery.surgeon && <p className="text-sm text-gray-600">Surgeon: <span className="font-medium">{surgery.surgeon}</span></p>}
                              {surgery.notes && <p className="text-sm text-gray-700 mt-2">{surgery.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {selectedAppointment.patientProfile.emergencyContact && (
                    (selectedAppointment.patientProfile.emergencyContact.name || selectedAppointment.patientProfile.emergencyContact.phone) && (
                      <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <PhoneCall className="w-5 h-5 text-green-500" />
                          Emergency Contact
                        </h4>
                        <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                          {selectedAppointment.patientProfile.emergencyContact.name && (
                            <p className="font-semibold text-gray-900 mb-1">{selectedAppointment.patientProfile.emergencyContact.name}</p>
                          )}
                          {selectedAppointment.patientProfile.emergencyContact.relation && (
                            <p className="text-sm text-gray-600 mb-2">{selectedAppointment.patientProfile.emergencyContact.relation}</p>
                          )}
                          {selectedAppointment.patientProfile.emergencyContact.phone && (
                            <p className="text-gray-700 font-medium flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {selectedAppointment.patientProfile.emergencyContact.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {/* Insurance Info */}
                  {selectedAppointment.patientProfile.insuranceInfo && (
                    (selectedAppointment.patientProfile.insuranceInfo.provider || selectedAppointment.patientProfile.insuranceInfo.policyNumber) && (
                      <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">Insurance Information</h4>
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-2">
                          {selectedAppointment.patientProfile.insuranceInfo.provider && (
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Provider:</span> <span className="font-medium text-gray-900">{selectedAppointment.patientProfile.insuranceInfo.provider}</span>
                            </p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.policyNumber && (
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Policy Number:</span> <span className="font-medium text-gray-900 font-mono">{selectedAppointment.patientProfile.insuranceInfo.policyNumber}</span>
                            </p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.groupNumber && (
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Group Number:</span> <span className="font-medium text-gray-900">{selectedAppointment.patientProfile.insuranceInfo.groupNumber}</span>
                            </p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.expiryDate && (
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Expiry Date:</span> <span className="font-medium text-gray-900">{format(new Date(selectedAppointment.patientProfile.insuranceInfo.expiryDate), 'MMMM d, yyyy')}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mark Payment as Paid Modal */}
      {showPaymentModal && selectedAppointment && selectedAppointment.payment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <IndianRupee className="w-6 h-6 text-green-500" />
                Mark Payment as Paid
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Patient: <span className="font-semibold">{selectedAppointment.patientId ? `${selectedAppointment.patientId.firstName || ''} ${selectedAppointment.patientId.lastName || ''}`.trim() : 'Unknown Patient'}</span></p>
                <p className="text-sm text-gray-600">Appointment: <span className="font-semibold">{selectedAppointment.appointmentNumber}</span></p>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Expected Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{selectedAppointment.payment?.amount || selectedAppointment.consultationFee || 0}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter amount paid"
                  />
                </div>
                {paymentAmount > 0 && selectedAppointment.payment && paymentAmount !== selectedAppointment.payment.amount && (
                  <p className="mt-2 text-xs text-yellow-600">
                    Amount differs from expected. Difference: ₹{Math.abs(paymentAmount - selectedAppointment.payment.amount)}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount(0);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={markingPayment}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaymentPaid}
                  disabled={markingPayment || paymentAmount <= 0}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {markingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark as Paid
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

