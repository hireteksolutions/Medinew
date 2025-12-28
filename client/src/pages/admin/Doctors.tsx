import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/api';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  UserX,
  UserCheck as UserCheckIcon,
  X,
  Calendar,
  Mail,
  Phone,
  Award,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToPDF } from '../../utils/exportUtils';
import Badge from '../../components/common/Badge';
import { getUserStatusBadgeVariant } from '../../utils/badgeUtils';
import { TOAST_MESSAGES } from '../../constants';

interface Doctor {
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
  specialization: string;
  licenseNumber: string;
  isApproved: boolean;
  rating: number;
  totalReviews: number;
  experience: number;
  consultationFee: number;
  totalAppointments?: number;
  totalPatients?: number;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Check for URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter === 'pending') {
      setApprovalFilter('pending');
    }
  }, []);

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

  useEffect(() => {
    fetchDoctors();
  }, [approvalFilter, specialtyFilter, statusFilter]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (approvalFilter !== 'all') params.approved = approvalFilter === 'approved';
      if (specialtyFilter) params.specialty = specialtyFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminService.getDoctors(params);
      setDoctors(response.data);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTORS_FAILED);
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDoctors();
  };

  const handleApprove = async (doctor: Doctor) => {
    try {
      await adminService.approveDoctor(doctor._id);
      toast.success(TOAST_MESSAGES.DOCTOR_APPROVED_SUCCESS);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_APPROVE_FAILED);
    }
  };

  const handleReject = async (doctor: Doctor) => {
    if (!confirm('Are you sure you want to reject this doctor? This will soft delete their profile.')) return;
    try {
      await adminService.rejectDoctor(doctor._id);
      toast.success(TOAST_MESSAGES.DOCTOR_REJECTED_SUCCESS);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_REJECT_FAILED);
    }
  };

  const handleSuspend = async (doctor: Doctor) => {
    if (!confirm('Are you sure you want to suspend this doctor?')) return;
    try {
      await adminService.suspendDoctor(doctor._id);
      toast.success(TOAST_MESSAGES.DOCTOR_SUSPENDED_SUCCESS);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_SUSPEND_FAILED);
    }
  };

  const handleActivate = async (doctor: Doctor) => {
    try {
      await adminService.activateDoctor(doctor._id);
      toast.success(TOAST_MESSAGES.DOCTOR_ACTIVATED_SUCCESS);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_ACTIVATE_FAILED);
    }
  };

  const handleDelete = async (doctor: Doctor) => {
    if (!confirm('Are you sure you want to delete this doctor? This will soft delete the doctor profile.')) return;
    try {
      await adminService.deleteDoctor(doctor._id);
      toast.success(TOAST_MESSAGES.DOCTOR_DELETED_SUCCESS);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_DELETE_FAILED);
    }
  };

  const handleViewDetails = async (doctorId: string) => {
    try {
      const response = await adminService.getDoctorById(doctorId);
      setSelectedDoctor(response.data);
      setShowDetails(true);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTOR_DETAILS_FAILED);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Specialty', 'Email', 'Phone', 'License', 'Registration Date', 'Status', 'Approval', 'Rating', 'Appointments', 'Patients'];
    const rows = doctors.map(d => [
      d._id,
      `Dr. ${d.userId.firstName} ${d.userId.lastName}`,
      d.specialization,
      d.userId.email,
      d.userId.phone || 'N/A',
      d.licenseNumber,
      format(new Date(d.userId.createdAt), 'yyyy-MM-dd'),
      d.userId.isActive ? 'Active' : 'Suspended',
      d.isApproved ? 'Approved' : 'Pending',
      d.rating.toFixed(1),
      d.totalAppointments || 0,
      d.totalPatients || 0
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctors_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(TOAST_MESSAGES.EXPORT_GENERATED_SUCCESS);
  };

  const exportToPDFHandler = () => {
    const headers = ['ID', 'Name', 'Specialty', 'Email', 'Phone', 'License', 'Registration Date', 'Status', 'Approval', 'Rating'];
    const rows = doctors.map(d => [
      d._id.slice(-8),
      `Dr. ${d.userId.firstName} ${d.userId.lastName}`,
      d.specialization,
      d.userId.email,
      d.userId.phone || 'N/A',
      d.licenseNumber,
      format(new Date(d.userId.createdAt), 'yyyy-MM-dd'),
      d.userId.isActive ? 'Active' : 'Suspended',
      d.isApproved ? 'Approved' : 'Pending',
      d.rating.toFixed(1)
    ]);

    exportToPDF({
      headers,
      rows,
      title: 'Doctor Management Report',
      filename: `doctors_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    });
    toast.success(TOAST_MESSAGES.PDF_EXPORT_GENERATED_SUCCESS);
  };

  // Get unique specialties for filter
  const specialties = Array.from(new Set(doctors.map(d => d.specialization))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Management</h1>
          <p className="text-gray-600 mt-1">Approve, manage, and monitor all doctor accounts</p>
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
              placeholder="Search by name, specialty, license, or email..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Specialties</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="card text-center py-12">
          <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No doctors found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">License</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Approval</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Account Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Appointments</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctors.map((doctor) => (
                  <tr key={doctor._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {doctor.userId.profileImage ? (
                          <img
                            src={doctor.userId.profileImage}
                            alt={`${doctor.userId.firstName} ${doctor.userId.lastName}`}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {doctor.userId.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{doctor.experience} years exp.</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary-600 font-medium">{doctor.specialization}</div>
                      <div className="text-xs text-gray-500 mt-0.5">₹{doctor.consultationFee}/visit</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{doctor.userId.email}</span>
                        </div>
                        {doctor.userId.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">{doctor.userId.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {doctor.licenseNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">({doctor.totalReviews})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={doctor.isApproved ? 'success' : 'warning'}>
                        {doctor.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getUserStatusBadgeVariant(doctor.userId.isActive)}>
                        {doctor.userId.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900">{doctor.totalAppointments || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative" ref={(el) => (dropdownRefs.current[doctor._id] = el)} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === doctor._id ? null : doctor._id)}
                          className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openDropdownId === doctor._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                            <button
                              onClick={() => {
                                handleViewDetails(doctor._id);
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            {!doctor.isApproved && (
                              <>
                                <button
                                  onClick={() => {
                                    handleApprove(doctor);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleReject(doctor);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            {doctor.userId.isActive ? (
                              <button
                                onClick={() => {
                                  handleSuspend(doctor);
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
                                  handleActivate(doctor);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <UserCheckIcon className="w-4 h-4" />
                                <span>Activate</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                handleDelete(doctor);
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

      {/* Doctor Details Modal */}
      {showDetails && selectedDoctor && selectedDoctor.doctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
              <h2 className="text-2xl font-bold">Doctor Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                {selectedDoctor.doctor.userId?.profileImage ? (
                  <img
                    src={selectedDoctor.doctor.userId.profileImage}
                    alt={`${selectedDoctor.doctor.userId.firstName} ${selectedDoctor.doctor.userId.lastName}`}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl font-bold">
                    {selectedDoctor.doctor.userId?.firstName?.[0]}{selectedDoctor.doctor.userId?.lastName?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-semibold">
                    Dr. {selectedDoctor.doctor.userId?.firstName} {selectedDoctor.doctor.userId?.lastName}
                  </h3>
                  <p className="text-primary-500 font-medium text-lg">{selectedDoctor.doctor.specialization}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <p className="text-gray-600 text-sm">{selectedDoctor.doctor.userId?.email}</p>
                    </div>
                    {selectedDoctor.doctor.userId?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <p className="text-gray-600 text-sm">{selectedDoctor.doctor.userId.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">License Number</p>
                    <p className="font-medium font-mono">{selectedDoctor.doctor.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Experience</p>
                    <p className="font-medium">{selectedDoctor.doctor.experience || 0} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Consultation Fee</p>
                    <p className="font-medium">₹{selectedDoctor.doctor.consultationFee}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Consultation Duration</p>
                    <p className="font-medium">{selectedDoctor.doctor.consultationDuration || 30} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Rating</p>
                    <p className="font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {selectedDoctor.doctor.rating?.toFixed(1) || '0.0'} ({selectedDoctor.doctor.totalReviews || 0} reviews)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                    <p className="font-medium">
                      {selectedDoctor.doctor.userId?.dateOfBirth 
                        ? format(new Date(selectedDoctor.doctor.userId.dateOfBirth), 'dd MMM yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                  {selectedDoctor.doctor.userId?.gender && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Gender</p>
                      <p className="font-medium capitalize">{selectedDoctor.doctor.userId.gender}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Registration Date</p>
                    <p className="font-medium">
                      {selectedDoctor.doctor.userId?.createdAt 
                        ? format(new Date(selectedDoctor.doctor.userId.createdAt), 'dd MMM yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Status</p>
                    <Badge variant={selectedDoctor.doctor.userId?.isActive ? 'success' : 'danger'}>
                      {selectedDoctor.doctor.userId?.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Approval Status</p>
                    <Badge variant={selectedDoctor.doctor.isApproved ? 'success' : 'warning'}>
                      {selectedDoctor.doctor.isApproved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedDoctor.doctor.userId?.address && (selectedDoctor.doctor.userId.address.street || selectedDoctor.doctor.userId.address.city) && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">
                      {selectedDoctor.doctor.userId.address.street && `${selectedDoctor.doctor.userId.address.street}, `}
                      {selectedDoctor.doctor.userId.address.city && `${selectedDoctor.doctor.userId.address.city}, `}
                      {selectedDoctor.doctor.userId.address.state && `${selectedDoctor.doctor.userId.address.state} `}
                      {selectedDoctor.doctor.userId.address.zipCode && `- ${selectedDoctor.doctor.userId.address.zipCode}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Biography */}
              {selectedDoctor.doctor.biography && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Biography</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedDoctor.doctor.biography}</p>
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedDoctor.doctor.education && selectedDoctor.doctor.education.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Education
                  </h4>
                  <div className="space-y-3">
                    {selectedDoctor.doctor.education.map((edu: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-gray-800">{edu.degree}</p>
                        <p className="text-gray-600">{edu.institution}</p>
                        {edu.year && <p className="text-sm text-gray-500">Year: {edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedDoctor.doctor.languages && selectedDoctor.doctor.languages.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoctor.doctor.languages.map((lang: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedDoctor.doctor.certifications && selectedDoctor.doctor.certifications.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Certifications
                  </h4>
                  <div className="space-y-3">
                    {selectedDoctor.doctor.certifications.map((cert: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-gray-800">{cert.name}</p>
                        {cert.issuingOrganization && (
                          <p className="text-gray-600">{cert.issuingOrganization}</p>
                        )}
                        {cert.certificateNumber && (
                          <p className="text-sm text-gray-500 font-mono">{cert.certificateNumber}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {cert.issueDate && (
                            <span>Issued: {format(new Date(cert.issueDate), 'dd MMM yyyy')}</span>
                          )}
                          {cert.expiryDate && (
                            <span>Expires: {format(new Date(cert.expiryDate), 'dd MMM yyyy')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedDoctor.stats?.totalAppointments || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Appointments</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedDoctor.stats?.totalPatients || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Patients</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{selectedDoctor.stats?.reviews || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
