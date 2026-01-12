import { useState, useEffect, useRef } from 'react';
import { adminService, appointmentService } from '../../services/api';
import { format } from 'date-fns';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  X,
  Eye,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  UserCheck,
  FileText,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  Calendar as CalendarIcon,
  Award,
  CreditCard,
  Languages
} from 'lucide-react';
import { APPOINTMENT_STATUSES, TOAST_MESSAGES, DATE_FORMATS } from '../../constants';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/exportUtils';
import DatePickerComponent from '../../components/common/DatePicker';
import Badge from '../../components/common/Badge';
import { getAppointmentBadgeVariant, getPaymentStatusBadgeVariant, toTitleCase } from '../../utils/badgeUtils';
import Pagination from '../../components/common/Pagination';

interface Appointment {
  _id: string;
  appointmentNumber: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    education?: Array<{ degree?: string; institution?: string; year?: string }>;
    languages?: string[];
  };
  appointmentDate: string;
  timeSlot: {
    start: string;
    end: string;
  };
  status: string;
  paymentStatus: string;
  consultationFee: number;
  reasonForVisit?: string;
  createdAt: string;
  reschedulingInfo?: {
    doctorUnavailabilityReason?: string;
    originalDate?: string;
    originalTimeSlot?: {
      start: string;
      end: string;
    };
    requestedBy?: string;
    requestedAt?: string;
  };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, week, month
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  
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

  // Reset to first page when filters change
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, dateFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter, dateFrom, dateTo, offset]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params: any = { 
        offset: offset,
        limit: limit
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter !== 'all') params.dateFilter = dateFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await adminService.getAppointments(params);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    fetchAppointments();
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await adminService.cancelAppointment(appointment._id);
      toast.success(TOAST_MESSAGES.APPOINTMENT_CANCELLED_SUCCESS);
      fetchAppointments();
    } catch (error) {
      toast.error(TOAST_MESSAGES.APPOINTMENT_CANCEL_FAILED);
    }
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const handleRescheduleClick = (appointment: Appointment) => {
    const initialDate = new Date(appointment.appointmentDate);
    setReschedulingAppointment(appointment);
    setRescheduleDate(initialDate);
    setRescheduleStartTime(appointment.timeSlot.start);
    setRescheduleEndTime(appointment.timeSlot.end);
    setRescheduleReason('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    setShowRescheduleModal(true);
    setOpenDropdownId(null);
    
    // Fetch available slots for the initial date
    if (initialDate >= new Date()) {
      setTimeout(() => {
        fetchAvailableSlots(initialDate, appointment.doctorId._id);
      }, 100);
    }
  };

  const fetchAvailableSlots = async (date: Date, doctorId: string) => {
    if (!date || !doctorId) {
      setAvailableSlots([]);
      return;
    }
    
    try {
      setLoadingSlots(true);
      const dateStr = format(date, DATE_FORMATS.API);
      const response = await appointmentService.getAvailableSlots(doctorId, dateStr);
      const slots = response.data?.slots || [];
      setAvailableSlots(slots);
      
      if (slots.length === 0) {
        toast.error('No available slots for this date. Please select another date.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOADING_AVAILABLE_SLOTS_FAILED);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setRescheduleDate(date);
    setSelectedSlot(null);
    setRescheduleStartTime('');
    setRescheduleEndTime('');
    
    if (date && reschedulingAppointment) {
      fetchAvailableSlots(date, reschedulingAppointment.doctorId._id);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
    setRescheduleStartTime(slot.start);
    setRescheduleEndTime(slot.end);
  };

  const handleReschedule = async () => {
    if (!reschedulingAppointment || !rescheduleDate || !selectedSlot) {
      toast.error(TOAST_MESSAGES.RESCHEDULE_DATE_AND_SLOT_REQUIRED);
      return;
    }

    try {
      setIsRescheduling(true);
      await adminService.rescheduleAppointment(reschedulingAppointment._id, {
        appointmentDate: format(rescheduleDate, DATE_FORMATS.API),
        timeSlot: {
          start: selectedSlot.start,
          end: selectedSlot.end
        },
        reason: rescheduleReason || undefined
      });
      
      toast.success(TOAST_MESSAGES.APPOINTMENT_RESCHEDULED_SUCCESS);
      setShowRescheduleModal(false);
      setReschedulingAppointment(null);
      setRescheduleDate(null);
      setSelectedSlot(null);
      setRescheduleStartTime('');
      setRescheduleEndTime('');
      setRescheduleReason('');
      setAvailableSlots([]);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setIsRescheduling(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Appointment Number',
      'Patient Name',
      'Patient Email',
      'Patient Phone',
      'Doctor Name',
      'Specialization',
      'Date',
      'Time',
      'Status',
      'Payment Status',
      'Fee',
      'Reason'
    ];
    
    const rows = appointments.map(apt => [
      apt.appointmentNumber || apt._id,
      `${apt.patientId.firstName} ${apt.patientId.lastName}`,
      apt.patientId.email,
      apt.patientId.phone || 'N/A',
      `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`,
      apt.doctorId.specialization,
      format(new Date(apt.appointmentDate), 'yyyy-MM-dd'),
      `${apt.timeSlot.start} - ${apt.timeSlot.end}`,
      toTitleCase(apt.status),
      toTitleCase(apt.paymentStatus || 'Pending'),
      `₹${apt.consultationFee}`,
      apt.reasonForVisit || 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(TOAST_MESSAGES.EXPORT_GENERATED_SUCCESS);
  };

  const exportToPDFHandler = () => {
    const headers = [
      'Appointment ID',
      'Patient Name',
      'Doctor Name',
      'Specialization',
      'Date',
      'Time',
      'Status',
      'Payment',
      'Fee'
    ];
    
    const rows = appointments.map(apt => [
      (apt.appointmentNumber || apt._id).slice(-8),
      `${apt.patientId.firstName} ${apt.patientId.lastName}`,
      `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`,
      apt.doctorId.specialization,
      format(new Date(apt.appointmentDate), 'yyyy-MM-dd'),
      `${apt.timeSlot.start} - ${apt.timeSlot.end}`,
      toTitleCase(apt.status),
      toTitleCase(apt.paymentStatus || 'Pending'),
      `₹${apt.consultationFee}`
    ]);

    exportToPDF({
      headers,
      rows,
      title: 'Appointment Management Report',
      filename: `appointments_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    });
    toast.success(TOAST_MESSAGES.PDF_EXPORT_GENERATED_SUCCESS);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUSES.COMPLETED:
        return <CheckCircle className="w-4 h-4" />;
      case APPOINTMENT_STATUSES.CANCELLED:
        return <XCircle className="w-4 h-4" />;
      case APPOINTMENT_STATUSES.PENDING:
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      apt.patientId.firstName.toLowerCase().includes(searchLower) ||
      apt.patientId.lastName.toLowerCase().includes(searchLower) ||
      apt.patientId.email.toLowerCase().includes(searchLower) ||
      apt.doctorId.firstName.toLowerCase().includes(searchLower) ||
      apt.doctorId.lastName.toLowerCase().includes(searchLower) ||
      apt.appointmentNumber?.toLowerCase().includes(searchLower) ||
      apt._id.toLowerCase().includes(searchLower)
    );
  });

  // Calculate statistics
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === APPOINTMENT_STATUSES.PENDING).length,
    completed: appointments.filter(a => a.status === APPOINTMENT_STATUSES.COMPLETED).length,
    cancelled: appointments.filter(a => a.status === APPOINTMENT_STATUSES.CANCELLED).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600 mt-1">View and manage all appointments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={exportToPDFHandler} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by appointment ID, patient name, doctor name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">Search</button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value={APPOINTMENT_STATUSES.PENDING}>Pending</option>
                <option value={APPOINTMENT_STATUSES.CONFIRMED}>Confirmed</option>
                <option value={APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED}>Reschedule Requested</option>
                <option value={APPOINTMENT_STATUSES.RESCHEDULED_BY_ADMIN}>Rescheduled by Admin</option>
                <option value={APPOINTMENT_STATUSES.COMPLETED}>Completed</option>
                <option value={APPOINTMENT_STATUSES.CANCELLED}>Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <DatePickerComponent
                    selected={dateFrom ? new Date(dateFrom) : null}
                    onChange={(date) => setDateFrom(date ? format(date, 'yyyy-MM-dd') : '')}
                    placeholderText="From Date"
                    dateFormat="MM/dd/yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <DatePickerComponent
                    selected={dateTo ? new Date(dateTo) : null}
                    onChange={(date) => setDateTo(date ? format(date, 'yyyy-MM-dd') : '')}
                    placeholderText="To Date"
                    dateFormat="MM/dd/yyyy"
                    minDate={dateFrom ? new Date(dateFrom) : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Appointments Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No appointments found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-mono text-xs">
                      #{appointment.appointmentNumber || appointment._id.slice(-6)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {appointment?.patientId && appointment?.patientId?.profileImage ? (
                        <img
                          src={appointment?.patientId?.profileImage}
                          alt={`${appointment?.patientId?.firstName} ${appointment?.patientId?.lastName}`}
                          className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                          {appointment?.patientId?.firstName?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {appointment?.patientId?.firstName} {appointment?.patientId?.lastName}
                        </div>
                        {appointment?.patientId?.email && (
                          <div className="text-xs text-gray-500 mt-0.5">{appointment?.patientId?.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Dr. {appointment?.doctorId?.firstName} {appointment?.doctorId?.lastName}
                      </div>
                      <div className="text-xs text-primary-600 font-medium mt-0.5">{appointment?.doctorId?.specialization}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center font-medium">
                        <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                        <span>{format(new Date(appointment?.appointmentDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-gray-500 mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary-500 mr-1.5 flex-shrink-0" />
                        <span className="text-xs">{appointment?.timeSlot?.start} - {appointment?.timeSlot?.end}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getAppointmentBadgeVariant(appointment?.status)}>
                      {toTitleCase(appointment?.status || '')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getPaymentStatusBadgeVariant(appointment?.paymentStatus || 'Pending')}>
                      {toTitleCase(appointment?.paymentStatus || 'Pending')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative" ref={(el) => (dropdownRefs.current[appointment?._id] = el)} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === appointment?._id ? null : appointment?._id)}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Actions"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openDropdownId === appointment._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                          <button
                            onClick={() => {
                              handleViewDetails(appointment);
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                          {(appointment.status === APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED ||
                            appointment.status === APPOINTMENT_STATUSES.PENDING ||
                            appointment.status === APPOINTMENT_STATUSES.CONFIRMED) && (
                            <button
                              onClick={() => handleRescheduleClick(appointment)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors border-t border-gray-100"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>Reschedule</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Appointment Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Appointment Details</h2>
                  <p className="text-primary-100 text-sm">#{selectedAppointment.appointmentNumber || selectedAppointment._id.slice(-8)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(95vh-140px)]">
              {/* Patient Information Card */}
              <div className="mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">Patient Information</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {selectedAppointment?.patientId?.profileImage ? (
                      <img
                        src={selectedAppointment.patientId.profileImage}
                        alt={`${selectedAppointment?.patientId?.firstName} ${selectedAppointment?.patientId?.lastName}`}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                        {selectedAppointment?.patientId?.firstName?.[0] || 'P'}
                      </div>
                    )}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Full Name</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedAppointment?.patientId?.firstName} {selectedAppointment?.patientId?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </p>
                        <p className="text-sm font-medium text-gray-900 break-all">{selectedAppointment?.patientId?.email}</p>
                      </div>
                      {selectedAppointment?.patientId?.phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            Phone
                          </p>
                          <p className="text-sm font-medium text-gray-900">{selectedAppointment.patientId.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Information Card */}
              <div className="mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">Doctor Information</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {selectedAppointment?.doctorId?.profileImage ? (
                      <img
                        src={selectedAppointment.doctorId.profileImage}
                        alt={`Dr. ${selectedAppointment?.doctorId?.firstName} ${selectedAppointment?.doctorId?.lastName}`}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                        Dr. {selectedAppointment?.doctorId?.firstName?.[0] || 'D'}
                      </div>
                    )}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Doctor Name</p>
                        <p className="text-lg font-semibold text-gray-900">
                          Dr. {selectedAppointment?.doctorId?.firstName} {selectedAppointment?.doctorId?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          Specialization
                        </p>
                        <p className="text-sm font-semibold text-primary-600">{selectedAppointment?.doctorId?.specialization}</p>
                      </div>
                      {selectedAppointment?.doctorId?.email && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </p>
                          <p className="text-sm font-medium text-gray-900 break-all">{selectedAppointment.doctorId.email}</p>
                        </div>
                      )}
                      {selectedAppointment?.doctorId?.phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            Phone
                          </p>
                          <p className="text-sm font-medium text-gray-900">{selectedAppointment.doctorId.phone}</p>
                        </div>
                      )}
                    </div>
                    {selectedAppointment?.doctorId?.education && selectedAppointment.doctorId.education.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          Education
                        </p>
                        <div className="space-y-2">
                          {selectedAppointment.doctorId.education.map((edu: any, index: number) => (
                            <div key={index} className="text-sm text-gray-900">
                              <p className="font-semibold">{edu.degree || 'N/A'}</p>
                              <p className="text-gray-600">{edu.institution || ''} {edu.year ? `(${edu.year})` : ''}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedAppointment?.doctorId?.languages && selectedAppointment.doctorId.languages.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                          <Languages className="w-3.5 h-3.5" />
                          Languages Spoken
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAppointment.doctorId.languages.map((lang: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rescheduling Info Card */}
              {selectedAppointment?.reschedulingInfo?.doctorUnavailabilityReason && (
                <div className="mb-6 p-5 bg-orange-50 border-2 border-orange-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                        Reschedule Request
                        <Badge variant="warning" className="text-xs">Action Required</Badge>
                      </h3>
                      <p className="text-sm text-orange-800 mb-3">
                        <strong>Doctor's Reason:</strong> {selectedAppointment.reschedulingInfo.doctorUnavailabilityReason}
                      </p>
                      {selectedAppointment.reschedulingInfo.originalDate && (
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <p className="text-xs font-medium text-orange-700 mb-1">Original Appointment:</p>
                          <p className="text-sm text-orange-800">
                            {format(new Date(selectedAppointment.reschedulingInfo.originalDate), 'EEEE, MMMM d, yyyy')} at{' '}
                            {selectedAppointment.reschedulingInfo.originalTimeSlot?.start} - {selectedAppointment.reschedulingInfo.originalTimeSlot?.end}
                          </p>
                          {selectedAppointment.reschedulingInfo.requestedAt && (
                            <p className="text-xs text-orange-600 mt-2">
                              Requested on: {format(new Date(selectedAppointment.reschedulingInfo.requestedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Details Card */}
              <div className="mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-100">
                  <div className="flex items-center gap-3 mb-4">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">Appointment Details</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Appointment Date</p>
                        <p className="text-base font-semibold text-gray-900">
                          {format(new Date(selectedAppointment?.appointmentDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Time Slot</p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedAppointment?.timeSlot?.start} - {selectedAppointment?.timeSlot?.end}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <IndianRupee className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Consultation Fee</p>
                        <p className="text-base font-semibold text-gray-900">₹{selectedAppointment?.consultationFee}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Appointment Status</p>
                        <Badge variant={getAppointmentBadgeVariant(selectedAppointment.status)} className="text-xs">
                          {toTitleCase(selectedAppointment.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Payment Status</p>
                        <Badge variant={getPaymentStatusBadgeVariant(selectedAppointment?.paymentStatus || 'Pending')} className="text-xs">
                          {toTitleCase(selectedAppointment?.paymentStatus || 'Pending')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason for Visit */}
              {selectedAppointment?.reasonForVisit && (
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-bold text-gray-900">Reason for Visit</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{selectedAppointment.reasonForVisit}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Reschedule Appointment Modal */}
      {showRescheduleModal && reschedulingAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRescheduleModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Reschedule Appointment</h2>
                  <p className="text-primary-100 text-sm font-medium">#{reschedulingAppointment.appointmentNumber || reschedulingAppointment._id.slice(-8)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors hover:scale-105"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(95vh-140px)]">
              {/* Original Appointment Info */}
              {reschedulingAppointment.reschedulingInfo?.doctorUnavailabilityReason && (
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 mb-2">Doctor Unavailability Notice</p>
                      <p className="text-sm text-amber-800 mb-2">
                        <strong>Reason:</strong> {reschedulingAppointment.reschedulingInfo.doctorUnavailabilityReason}
                      </p>
                      <p className="text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-md">
                        <strong>Original Date:</strong> {format(new Date(reschedulingAppointment.appointmentDate), 'EEEE, MMMM d, yyyy')} at {reschedulingAppointment.timeSlot.start} - {reschedulingAppointment.timeSlot.end}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Info */}
              <div className="mb-6 p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border-2 border-primary-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Patient Information</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-900">
                    {reschedulingAppointment.patientId.firstName} {reschedulingAppointment.patientId.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-primary-600" />
                    <span>{reschedulingAppointment.patientId.email}</span>
                  </div>
                  {reschedulingAppointment.patientId.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4 text-primary-600" />
                      <span>{reschedulingAppointment.patientId.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reschedule Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    New Date <span className="text-red-500">*</span>
                  </label>
                  <DatePickerComponent
                    selected={rescheduleDate}
                    onChange={handleDateChange}
                    minDate={new Date()}
                    placeholderText="Select new date"
                    dateFormat={DATE_FORMATS.DISPLAY_FULL}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                    wrapperClassName="w-full"
                  />
                </div>

                {/* Available Slots Display */}
                {rescheduleDate && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-600" />
                      Available Time Slots <span className="text-red-500">*</span>
                    </label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        <span className="ml-3 text-gray-700 font-medium">Loading available slots...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-700 font-semibold text-base mb-1">No available slots for this date</p>
                        <p className="text-sm text-gray-500">Please select another date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
                        {availableSlots.map((slot, index) => {
                          const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                          return (
                            <button
                              key={`${slot.start}-${slot.end}-${index}`}
                              onClick={() => handleSlotSelect(slot)}
                              className={`p-4 rounded-lg border-2 transition-all text-center transform hover:scale-105 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-700 text-white shadow-lg scale-105'
                                  : 'bg-white border-gray-300 hover:border-primary-400 hover:bg-primary-50 text-gray-900 hover:shadow-md'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-white/20' : 'bg-primary-100'
                                }`}>
                                  <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-primary-600'}`} />
                                </div>
                                <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                  {format(new Date(`2000-01-01T${slot.start}`), DATE_FORMATS.TIME_12H)}
                                </div>
                                <div className={`text-xs font-medium ${isSelected ? 'text-primary-100' : 'text-gray-600'}`}>
                                  to {format(new Date(`2000-01-01T${slot.end}`), DATE_FORMATS.TIME_12H)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary-800 mb-1">Selected Time Slot</p>
                        <p className="text-base font-bold text-primary-900">
                          {format(new Date(`2000-01-01T${selectedSlot.start}`), DATE_FORMATS.TIME_12H)} - {format(new Date(`2000-01-01T${selectedSlot.end}`), DATE_FORMATS.TIME_12H)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    Reason for Rescheduling (Optional)
                  </label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Reason for rescheduling (e.g., Patient requested new time, Doctor availability change, etc.)"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none transition-all text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setReschedulingAppointment(null);
                    setRescheduleDate(null);
                    setSelectedSlot(null);
                    setRescheduleStartTime('');
                    setRescheduleEndTime('');
                    setRescheduleReason('');
                    setAvailableSlots([]);
                  }}
                  disabled={isRescheduling}
                  className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 border-2 border-gray-300 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={isRescheduling || !rescheduleDate || !selectedSlot}
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-primary-700 transform hover:scale-105 disabled:transform-none"
                >
                  {isRescheduling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Rescheduling...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Reschedule Appointment</span>
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
