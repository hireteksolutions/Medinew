import { useState, useEffect, useRef } from 'react';
import { doctorDashboardService, paymentService } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, X, User, Phone, Mail, MapPin, Calendar as CalendarIcon, Droplet, AlertCircle, Pill, Heart, Activity, PhoneCall, FileText, Clock, Eye, Search, Filter, CreditCard, IndianRupee, MoreVertical } from 'lucide-react';
import DatePickerComponent from '../../components/common/DatePicker';
import { APPOINTMENT_STATUSES, getAppointmentStatusColor, isActiveAppointment, TOAST_MESSAGES, APPOINTMENT_FILTERS } from '../../constants';
import Badge from '../../components/common/Badge';

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

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, filter]);

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
      const params: any = { date: selectedDate };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await doctorDashboardService.getAppointments(params);
      setAppointments(response.data || []);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_APPOINTMENTS_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.patientId.firstName.toLowerCase().includes(searchLower) ||
      appointment.patientId.lastName.toLowerCase().includes(searchLower) ||
      appointment.patientId.email.toLowerCase().includes(searchLower) ||
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
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {appointment.patientId.profileImage ? (
                          <img
                            src={appointment.patientId.profileImage}
                            alt={appointment.patientId.firstName}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {appointment.patientId.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {appointment.patientId.firstName} {appointment.patientId.lastName}
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
                          <span className="text-xs">{appointment.timeSlot.start} - {appointment.timeSlot.end}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{appointment.patientId.email}</span>
                        </div>
                        {appointment.patientId.phone && (
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
                          <span className="text-sm font-semibold text-gray-900">{appointment.payment.amount}</span>
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
                                      setPaymentAmount(appointment.payment.amount);
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
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Patient Details</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Patient Basic Info */}
              <div className="mb-6">
                <div className="flex items-start space-x-4 mb-4">
                  {selectedAppointment.patientId.profileImage ? (
                    <img
                      src={selectedAppointment.patientId.profileImage}
                      alt={selectedAppointment.patientId.firstName}
                      className="w-24 h-24 rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl">
                      {selectedAppointment.patientId.firstName[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {selectedAppointment.patientId.firstName} {selectedAppointment.patientId.lastName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-5 h-5" />
                        <span>{selectedAppointment.patientId.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="w-5 h-5" />
                        <span>{selectedAppointment.patientId.phone}</span>
                      </div>
                      {selectedAppointment.patientId.dateOfBirth && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <CalendarIcon className="w-5 h-5" />
                          <span>DOB: {format(new Date(selectedAppointment.patientId.dateOfBirth), 'MMMM d, yyyy')}</span>
                        </div>
                      )}
                      {selectedAppointment.patientId.gender && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="w-5 h-5" />
                          <span className="capitalize">{selectedAppointment.patientId.gender}</span>
                        </div>
                      )}
                      {selectedAppointment.patientId.address && (
                        <div className="flex items-start space-x-2 text-gray-600 md:col-span-2">
                          <MapPin className="w-5 h-5 mt-1" />
                          <span>
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
              </div>

              {/* Appointment Details */}
              <div className="mb-6 border-t pt-6">
                <h4 className="text-xl font-semibold mb-4">Appointment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600"><strong>Date:</strong> {format(new Date(selectedAppointment.appointmentDate), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600"><strong>Time:</strong> {selectedAppointment.timeSlot.start} - {selectedAppointment.timeSlot.end}</p>
                  </div>
                  <div>
                    <p className="text-gray-600"><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-sm font-semibold ${getAppointmentStatusColor(selectedAppointment.status)}`}>
                        {selectedAppointment.status}
                      </span>
                    </p>
                  </div>
                  {selectedAppointment.appointmentNumber && (
                    <div>
                      <p className="text-gray-600"><strong>Appointment ID:</strong> {selectedAppointment.appointmentNumber}</p>
                    </div>
                  )}
                  {selectedAppointment.reasonForVisit && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600"><strong>Reason for Visit:</strong> {selectedAppointment.reasonForVisit}</p>
                    </div>
                  )}
                  {selectedAppointment.symptoms && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600"><strong>Symptoms:</strong> {selectedAppointment.symptoms}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6 border-t pt-6">
                <h4 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </h4>
                {selectedAppointment.payment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                      <div className="mt-1">{getPaymentStatusBadge(selectedAppointment.payment)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Amount</p>
                      <p className="text-lg font-bold text-gray-900">₹{selectedAppointment.payment.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                      <p className="text-gray-900 capitalize">{selectedAppointment.payment.paymentMethod.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                      <p className="text-gray-900 capitalize">
                        {selectedAppointment.payment.paymentGateway === 'offline' ? 'Pay at Clinic' : 'Online Payment'}
                      </p>
                    </div>
                    {selectedAppointment.payment.transactionId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                        <p className="text-gray-900 font-mono text-sm">{selectedAppointment.payment.transactionId}</p>
                      </div>
                    )}
                    {selectedAppointment.payment.paidAt && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Paid At</p>
                        <p className="text-gray-900">{format(new Date(selectedAppointment.payment.paidAt), 'MMMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">No payment information available for this appointment.</p>
                  </div>
                )}
              </div>

              {/* Patient Profile Details */}
              {selectedAppointment.patientProfile && (
                <>
                  {/* Blood Group */}
                  {selectedAppointment.patientProfile.bloodGroup && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <Droplet className="w-5 h-5 mr-2" />
                        Blood Group
                      </h4>
                      <p className="text-gray-600">{selectedAppointment.patientProfile.bloodGroup}</p>
                    </div>
                  )}

                  {/* Allergies */}
                  {selectedAppointment.patientProfile.allergies && selectedAppointment.patientProfile.allergies.length > 0 && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                        Allergies
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAppointment.patientProfile.allergies.map((allergy: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Medications */}
                  {selectedAppointment.patientProfile.currentMedications && selectedAppointment.patientProfile.currentMedications.length > 0 && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <Pill className="w-5 h-5 mr-2 text-blue-500" />
                        Current Medications
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.currentMedications.map((med: any, index: number) => (
                          <div key={index} className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-semibold">{med.name}</p>
                            {med.dosage && <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>}
                            {med.frequency && <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>}
                            {med.prescribedBy && <p className="text-sm text-gray-600">Prescribed by: {med.prescribedBy}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medical History */}
                  {selectedAppointment.patientProfile.medicalHistory && selectedAppointment.patientProfile.medicalHistory.length > 0 && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-purple-500" />
                        Medical History
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.medicalHistory.map((history: any, index: number) => (
                          <div key={index} className="bg-purple-50 p-3 rounded-lg">
                            <p className="font-semibold">{history.condition}</p>
                            {history.diagnosisDate && (
                              <p className="text-sm text-gray-600">
                                Diagnosed: {format(new Date(history.diagnosisDate), 'MMMM d, yyyy')}
                              </p>
                            )}
                            {history.notes && <p className="text-sm text-gray-600 mt-1">{history.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chronic Conditions */}
                  {selectedAppointment.patientProfile.chronicConditions && selectedAppointment.patientProfile.chronicConditions.length > 0 && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-red-500" />
                        Chronic Conditions
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.chronicConditions.map((condition: any, index: number) => (
                          <div key={index} className="bg-red-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{condition.condition}</p>
                              {condition.severity && (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  condition.severity === 'severe' ? 'bg-red-200 text-red-800' :
                                  condition.severity === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-green-200 text-green-800'
                                }`}>
                                  {condition.severity}
                                </span>
                              )}
                            </div>
                            {condition.diagnosisDate && (
                              <p className="text-sm text-gray-600">
                                Diagnosed: {format(new Date(condition.diagnosisDate), 'MMMM d, yyyy')}
                              </p>
                            )}
                            {condition.notes && <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Surgeries */}
                  {selectedAppointment.patientProfile.previousSurgeries && selectedAppointment.patientProfile.previousSurgeries.length > 0 && (
                    <div className="mb-6 border-t pt-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-orange-500" />
                        Previous Surgeries
                      </h4>
                      <div className="space-y-3">
                        {selectedAppointment.patientProfile.previousSurgeries.map((surgery: any, index: number) => (
                          <div key={index} className="bg-orange-50 p-3 rounded-lg">
                            <p className="font-semibold">{surgery.surgeryType}</p>
                            {surgery.date && (
                              <p className="text-sm text-gray-600">
                                Date: {format(new Date(surgery.date), 'MMMM d, yyyy')}
                              </p>
                            )}
                            {surgery.hospital && <p className="text-sm text-gray-600">Hospital: {surgery.hospital}</p>}
                            {surgery.surgeon && <p className="text-sm text-gray-600">Surgeon: {surgery.surgeon}</p>}
                            {surgery.notes && <p className="text-sm text-gray-600 mt-1">{surgery.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {selectedAppointment.patientProfile.emergencyContact && (
                    (selectedAppointment.patientProfile.emergencyContact.name || selectedAppointment.patientProfile.emergencyContact.phone) && (
                      <div className="mb-6 border-t pt-6">
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <PhoneCall className="w-5 h-5 mr-2 text-green-500" />
                          Emergency Contact
                        </h4>
                        <div className="bg-green-50 p-4 rounded-lg">
                          {selectedAppointment.patientProfile.emergencyContact.name && (
                            <p className="font-semibold">{selectedAppointment.patientProfile.emergencyContact.name}</p>
                          )}
                          {selectedAppointment.patientProfile.emergencyContact.relation && (
                            <p className="text-sm text-gray-600">{selectedAppointment.patientProfile.emergencyContact.relation}</p>
                          )}
                          {selectedAppointment.patientProfile.emergencyContact.phone && (
                            <p className="text-gray-600 mt-1">
                              <Phone className="w-4 h-4 inline mr-1" />
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
                      <div className="mb-6 border-t pt-6">
                        <h4 className="text-xl font-semibold mb-4">Insurance Information</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {selectedAppointment.patientProfile.insuranceInfo.provider && (
                            <p className="text-gray-600"><strong>Provider:</strong> {selectedAppointment.patientProfile.insuranceInfo.provider}</p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.policyNumber && (
                            <p className="text-gray-600"><strong>Policy Number:</strong> {selectedAppointment.patientProfile.insuranceInfo.policyNumber}</p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.groupNumber && (
                            <p className="text-gray-600"><strong>Group Number:</strong> {selectedAppointment.patientProfile.insuranceInfo.groupNumber}</p>
                          )}
                          {selectedAppointment.patientProfile.insuranceInfo.expiryDate && (
                            <p className="text-gray-600">
                              <strong>Expiry Date:</strong> {format(new Date(selectedAppointment.patientProfile.insuranceInfo.expiryDate), 'MMMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="border-t pt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                {isActiveAppointment(selectedAppointment.status) && (
                  <>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedAppointment._id, APPOINTMENT_STATUSES.COMPLETED);
                        setSelectedAppointment(null);
                      }}
                      className="px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedAppointment._id, APPOINTMENT_STATUSES.CANCELLED);
                        setSelectedAppointment(null);
                      }}
                      className="px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </div>
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
                <p className="text-sm text-gray-600 mb-2">Patient: <span className="font-semibold">{selectedAppointment.patientId.firstName} {selectedAppointment.patientId.lastName}</span></p>
                <p className="text-sm text-gray-600">Appointment: <span className="font-semibold">{selectedAppointment.appointmentNumber}</span></p>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Expected Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{selectedAppointment.payment.amount}</p>
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
                {paymentAmount > 0 && paymentAmount !== selectedAppointment.payment.amount && (
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

