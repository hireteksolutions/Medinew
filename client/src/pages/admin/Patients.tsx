import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/api';
import { 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  Eye,
  Download,
  UserX,
  UserCheck,
  X,
  Calendar,
  Mail,
  Phone,
  FileText,
  MoreVertical,
  Droplet,
  AlertCircle,
  Pill,
  Heart,
  Activity,
  IndianRupee,
  Clock,
  User,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToPDF } from '../../utils/exportUtils';
import DatePickerComponent from '../../components/common/DatePicker';
import Badge from '../../components/common/Badge';
import { getUserStatusBadgeVariant, getAppointmentBadgeVariant, getPaymentStatusBadgeVariant } from '../../utils/badgeUtils';
import { TOAST_MESSAGES } from '../../constants';
import Pagination from '../../components/common/Pagination';
import ConfirmationModal from '../../components/common/ConfirmationModal';

interface Patient {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileImage?: string;
    isActive: boolean;
    createdAt: string;
  };
  totalAppointments: number;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Confirmation modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToAction, setPatientToAction] = useState<Patient | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    page: 1,
    pages: 0
  });

  // Reset to first page when filters change
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, dateFrom, dateTo, searchTerm]);

  useEffect(() => {
    fetchPatients();
  }, [statusFilter, dateFrom, dateTo, offset]);

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

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params: any = {
        offset: offset,
        limit: limit
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await adminService.getPatients(params);
      // Backend returns { patients, pagination }, so we need to extract the patients array
      const patientsData = response.data?.patients || response.data || [];
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_PATIENTS_FAILED);
      console.error('Error fetching patients:', error);
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    fetchPatients();
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuspendClick = (patient: Patient) => {
    setPatientToAction(patient);
    setShowSuspendModal(true);
  };

  const handleSuspend = async () => {
    if (!patientToAction) return;
    setIsProcessing(true);
    try {
      await adminService.suspendPatient(patientToAction._id);
      toast.success(TOAST_MESSAGES.PATIENT_SUSPENDED_SUCCESS);
      setShowSuspendModal(false);
      setPatientToAction(null);
      fetchPatients();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PATIENT_SUSPEND_FAILED);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivate = async (patient: Patient) => {
    try {
      await adminService.activatePatient(patient._id);
      toast.success(TOAST_MESSAGES.PATIENT_ACTIVATED_SUCCESS);
      fetchPatients();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PATIENT_ACTIVATE_FAILED);
    }
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToAction(patient);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!patientToAction) return;
    setIsProcessing(true);
    try {
      await adminService.deletePatient(patientToAction._id);
      toast.success(TOAST_MESSAGES.PATIENT_DELETED_SUCCESS);
      setShowDeleteModal(false);
      setPatientToAction(null);
      fetchPatients();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PATIENT_DELETE_FAILED);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = async (patientId: string) => {
    try {
      const response = await adminService.getPatientById(patientId);
      setSelectedPatient(response.data);
      setShowDetails(true);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_PATIENT_DETAILS_FAILED);
    }
  };

  const exportToCSV = () => {
    if (!Array.isArray(patients) || patients.length === 0) {
      toast.error('No patients data to export');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Registration Date', 'Status', 'Total Appointments'];
    const rows = patients.map(p => [
      p._id,
      `${p.userId.firstName} ${p.userId.lastName}`,
      p.userId.email,
      p.userId.phone || 'N/A',
      format(new Date(p.userId.createdAt), 'yyyy-MM-dd'),
      p.userId.isActive ? 'Active' : 'Suspended',
      p.totalAppointments
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(TOAST_MESSAGES.EXPORT_GENERATED_SUCCESS);
  };

  const exportToPDFHandler = () => {
    if (!Array.isArray(patients) || patients.length === 0) {
      toast.error('No patients data to export');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Registration Date', 'Status', 'Total Appointments'];
    const rows = patients.map(p => [
      p._id.slice(-8),
      `${p.userId.firstName} ${p.userId.lastName}`,
      p.userId.email,
      p.userId.phone || 'N/A',
      format(new Date(p.userId.createdAt), 'yyyy-MM-dd'),
      p.userId.isActive ? 'Active' : 'Suspended',
      p.totalAppointments.toString()
    ]);

    exportToPDF({
      headers,
      rows,
      title: 'Patient Management Report',
      filename: `patients_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    });
    toast.success(TOAST_MESSAGES.PDF_EXPORT_GENERATED_SUCCESS);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600 mt-1">View and manage all patient accounts</p>
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

      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
            </div>
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
          </div>
        )}
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No patients found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Registration Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Appointments</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(patients) && patients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {patient.userId.profileImage ? (
                          <img
                            src={patient.userId.profileImage}
                            alt={`${patient.userId.firstName} ${patient.userId.lastName}`}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {patient.userId.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {patient.userId.firstName} {patient.userId.lastName}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">ID: {patient._id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{patient.userId.email}</span>
                        </div>
                        {patient.userId.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">{patient.userId.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center font-medium">
                          <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                          <span>{format(new Date(patient.userId.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getUserStatusBadgeVariant(patient.userId.isActive)}>
                        {patient.userId.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{patient.totalAppointments || 0}</div>
                          <div className="text-xs text-gray-500">appointments</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative" ref={(el) => (dropdownRefs.current[patient._id] = el)} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === patient._id ? null : patient._id)}
                          className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openDropdownId === patient._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                            <button
                              onClick={() => {
                                handleViewDetails(patient._id);
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            {patient.userId.isActive ? (
                              <button
                                onClick={() => {
                                  handleSuspendClick(patient);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 transition-colors"
                              >
                                <UserX className="w-4 h-4" />
                                <span>Suspend</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleActivate(patient);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Activate</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                handleDeleteClick(patient);
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
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

      {showDetails && selectedPatient && selectedPatient.patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                {selectedPatient.patient.userId?.profileImage ? (
                  <img
                    src={selectedPatient.patient.userId.profileImage}
                    alt={`${selectedPatient.patient.userId.firstName} ${selectedPatient.patient.userId.lastName}`}
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-primary-200">
                    {selectedPatient.patient.userId?.firstName?.[0]}{selectedPatient.patient.userId?.lastName?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {selectedPatient.patient.userId?.firstName} {selectedPatient.patient.userId?.lastName}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <p className="text-gray-600 text-sm">{selectedPatient.patient.userId?.email}</p>
                    </div>
                    {selectedPatient.patient.userId?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <p className="text-gray-600 text-sm">{selectedPatient.patient.userId.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getUserStatusBadgeVariant(selectedPatient.patient.userId?.isActive)}>
                      {selectedPatient.patient.userId?.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                    {selectedPatient.patient.userId?.isVerified && (
                      <Badge variant="success">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {selectedPatient.statistics && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedPatient.statistics.totalAppointments || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Appointments</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedPatient.statistics.completedAppointments || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Completed</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">{selectedPatient.statistics.upcomingAppointments || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Upcoming</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedPatient.statistics.medicalRecordsCount || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Medical Records</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1">
                        <IndianRupee className="w-5 h-5" />
                        {selectedPatient.statistics.totalPaid?.toFixed(0) || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Total Paid</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Patient ID</p>
                    <p className="font-medium font-mono text-xs">{selectedPatient.patient._id.slice(-8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                    <p className="font-medium">
                      {selectedPatient.patient.userId?.dateOfBirth 
                        ? format(new Date(selectedPatient.patient.userId.dateOfBirth), 'dd MMM yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                  {selectedPatient.patient.userId?.gender && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Gender</p>
                      <p className="font-medium capitalize">{selectedPatient.patient.userId.gender}</p>
                    </div>
                  )}
                  {selectedPatient.patient.bloodGroup && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Droplet className="w-4 h-4" />
                        Blood Group
                      </p>
                      <p className="font-medium">{selectedPatient.patient.bloodGroup}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Registration Date</p>
                    <p className="font-medium">
                      {selectedPatient.patient.userId?.createdAt 
                        ? format(new Date(selectedPatient.patient.userId.createdAt), 'dd MMM yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Status</p>
                    <Badge variant={getUserStatusBadgeVariant(selectedPatient.patient.userId?.isActive)}>
                      {selectedPatient.patient.userId?.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedPatient.patient.userId?.address && (selectedPatient.patient.userId.address.street || selectedPatient.patient.userId.address.city) && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">
                      {selectedPatient.patient.userId.address.street && `${selectedPatient.patient.userId.address.street}, `}
                      {selectedPatient.patient.userId.address.city && `${selectedPatient.patient.userId.address.city}, `}
                      {selectedPatient.patient.userId.address.state && `${selectedPatient.patient.userId.address.state} `}
                      {selectedPatient.patient.userId.address.zipCode && `- ${selectedPatient.patient.userId.address.zipCode}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Medical Information */}
              {(selectedPatient.patient.allergies?.length > 0 || 
                selectedPatient.patient.medicalHistory?.length > 0 || 
                selectedPatient.patient.currentMedications?.length > 0 ||
                selectedPatient.patient.chronicConditions?.length > 0 ||
                selectedPatient.patient.previousSurgeries?.length > 0) && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Medical Information
                  </h4>
                  <div className="space-y-4">
                    {selectedPatient.patient.allergies && selectedPatient.patient.allergies.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          Allergies
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPatient.patient.allergies.map((allergy: string, index: number) => (
                            <span key={index} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedPatient.patient.currentMedications && selectedPatient.patient.currentMedications.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Pill className="w-4 h-4 text-blue-500" />
                          Current Medications
                        </p>
                        <div className="space-y-2">
                          {selectedPatient.patient.currentMedications.map((med: any, index: number) => (
                            <div key={index} className="bg-blue-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-800">{med.name}</p>
                              {med.dosage && <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>}
                              {med.frequency && <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>}
                              {med.prescribedBy && <p className="text-sm text-gray-500">Prescribed by: {med.prescribedBy}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPatient.patient.chronicConditions && selectedPatient.patient.chronicConditions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Heart className="w-4 h-4 text-purple-500" />
                          Chronic Conditions
                        </p>
                        <div className="space-y-2">
                          {selectedPatient.patient.chronicConditions.map((condition: any, index: number) => (
                            <div key={index} className="bg-purple-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-800">{condition.condition}</p>
                              {condition.severity && <p className="text-sm text-gray-600 capitalize">Severity: {condition.severity}</p>}
                              {condition.diagnosisDate && (
                                <p className="text-sm text-gray-500">
                                  Diagnosed: {format(new Date(condition.diagnosisDate), 'dd MMM yyyy')}
                                </p>
                              )}
                              {condition.notes && <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPatient.patient.medicalHistory && selectedPatient.patient.medicalHistory.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Medical History</p>
                        <div className="space-y-2">
                          {selectedPatient.patient.medicalHistory.map((history: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-800">{history.condition}</p>
                              {history.diagnosisDate && (
                                <p className="text-sm text-gray-500">
                                  {format(new Date(history.diagnosisDate), 'dd MMM yyyy')}
                                </p>
                              )}
                              {history.notes && <p className="text-sm text-gray-600 mt-1">{history.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPatient.patient.previousSurgeries && selectedPatient.patient.previousSurgeries.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Previous Surgeries</p>
                        <div className="space-y-2">
                          {selectedPatient.patient.previousSurgeries.map((surgery: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-800">{surgery.surgeryType}</p>
                              {surgery.date && (
                                <p className="text-sm text-gray-500">
                                  Date: {format(new Date(surgery.date), 'dd MMM yyyy')}
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
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {selectedPatient.patient.emergencyContact && (
                (selectedPatient.patient.emergencyContact.name || selectedPatient.patient.emergencyContact.phone) && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Emergency Contact
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedPatient.patient.emergencyContact.name && (
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{selectedPatient.patient.emergencyContact.name}</p>
                          </div>
                        )}
                        {selectedPatient.patient.emergencyContact.phone && (
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{selectedPatient.patient.emergencyContact.phone}</p>
                          </div>
                        )}
                        {selectedPatient.patient.emergencyContact.relation && (
                          <div>
                            <p className="text-sm text-gray-500">Relation</p>
                            <p className="font-medium">{selectedPatient.patient.emergencyContact.relation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Insurance Information */}
              {selectedPatient.patient.insuranceInfo && (
                (selectedPatient.patient.insuranceInfo.provider || selectedPatient.patient.insuranceInfo.policyNumber) && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Insurance Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPatient.patient.insuranceInfo.provider && (
                          <div>
                            <p className="text-sm text-gray-500">Provider</p>
                            <p className="font-medium">{selectedPatient.patient.insuranceInfo.provider}</p>
                          </div>
                        )}
                        {selectedPatient.patient.insuranceInfo.policyNumber && (
                          <div>
                            <p className="text-sm text-gray-500">Policy Number</p>
                            <p className="font-medium font-mono">{selectedPatient.patient.insuranceInfo.policyNumber}</p>
                          </div>
                        )}
                        {selectedPatient.patient.insuranceInfo.groupNumber && (
                          <div>
                            <p className="text-sm text-gray-500">Group Number</p>
                            <p className="font-medium">{selectedPatient.patient.insuranceInfo.groupNumber}</p>
                          </div>
                        )}
                        {selectedPatient.patient.insuranceInfo.expiryDate && (
                          <div>
                            <p className="text-sm text-gray-500">Expiry Date</p>
                            <p className="font-medium">
                              {format(new Date(selectedPatient.patient.insuranceInfo.expiryDate), 'dd MMM yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Appointment History */}
              {selectedPatient.appointments && selectedPatient.appointments.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Appointment History
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Date & Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Doctor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Payment Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Payment Mode</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPatient.appointments.map((appointment: any) => (
                          <tr key={appointment._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {format(new Date(appointment.appointmentDate), 'dd MMM yyyy')}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {appointment.timeSlot?.start} - {appointment.timeSlot?.end}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {appointment.doctorId?.firstName} {appointment.doctorId?.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{appointment.doctorId?.specialization}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant={getAppointmentBadgeVariant(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant={getPaymentStatusBadgeVariant(appointment.payment?.status || 'N/A')}>
                                {appointment.payment?.status || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {appointment.payment?.paymentGateway === 'offline' ? 'Pay at Clinic' : appointment.payment?.paymentGateway === 'online' ? 'Online' : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {appointment.payment?.amount ? (
                                <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                  <IndianRupee className="w-4 h-4" />
                                  {appointment.payment.amount}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setPatientToAction(null);
        }}
        onConfirm={handleSuspend}
        title="Suspend Patient"
        message={`Are you sure you want to suspend ${patientToAction?.userId.firstName} ${patientToAction?.userId.lastName}? This will prevent them from accessing their account.`}
        confirmText="Suspend Patient"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPatientToAction(null);
        }}
        onConfirm={handleDelete}
        title="Delete Patient"
        message={`Are you sure you want to delete ${patientToAction?.userId.firstName} ${patientToAction?.userId.lastName}? This action cannot be undone.`}
        confirmText="Delete Patient"
        cancelText="Cancel"
        type="danger"
        isLoading={isProcessing}
      />
    </div>
  );
}

