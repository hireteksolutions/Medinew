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
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToPDF } from '../../utils/exportUtils';
import DatePickerComponent from '../../components/common/DatePicker';
import Badge from '../../components/common/Badge';
import { getUserStatusBadgeVariant } from '../../utils/badgeUtils';
import { TOAST_MESSAGES } from '../../constants';

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

  useEffect(() => {
    fetchPatients();
  }, [statusFilter, dateFrom, dateTo]);

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
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await adminService.getPatients(params);
      setPatients(response.data);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_PATIENTS_FAILED);
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchPatients();
  };

  const handleSuspend = async (patient: Patient) => {
    if (!confirm('Are you sure you want to suspend this patient?')) return;
    try {
      await adminService.suspendPatient(patient._id);
      toast.success(TOAST_MESSAGES.PATIENT_SUSPENDED_SUCCESS);
      fetchPatients();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PATIENT_SUSPEND_FAILED);
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

  const handleDelete = async (patient: Patient) => {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;
    try {
      await adminService.deletePatient(patient._id);
      toast.success(TOAST_MESSAGES.PATIENT_DELETED_SUCCESS);
      fetchPatients();
    } catch (error) {
      toast.error(TOAST_MESSAGES.PATIENT_DELETE_FAILED);
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
                {patients.map((patient) => (
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
                                  handleSuspend(patient);
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
                                handleDelete(patient);
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
        </div>
      )}

      {showDetails && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Patient Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b">
                {selectedPatient.patient?.userId?.profileImage ? (
                  <img
                    src={selectedPatient.patient.userId.profileImage}
                    alt={`${selectedPatient.patient.userId.firstName} ${selectedPatient.patient.userId.lastName}`}
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl">
                    {selectedPatient.patient?.userId?.firstName?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedPatient.patient?.userId?.firstName} {selectedPatient.patient?.userId?.lastName}
                  </h3>
                  <p className="text-gray-600">{selectedPatient.patient?.userId?.email}</p>
                  <span
                    className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedPatient.patient?.userId?.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedPatient.patient?.userId?.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedPatient.patient?.userId?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registration Date</p>
                  <p className="font-medium">
                    {selectedPatient.patient?.userId?.createdAt 
                      ? format(new Date(selectedPatient.patient.userId.createdAt), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

