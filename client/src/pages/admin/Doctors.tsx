import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/api';
import { 
  UserCheck, 
  Search, 
  Filter, 
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
  FileText,
  MoreVertical,
  Clock,
  IndianRupee,
  Users,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToPDF } from '../../utils/exportUtils';
import Badge from '../../components/common/Badge';
import { getUserStatusBadgeVariant } from '../../utils/badgeUtils';
import { TOAST_MESSAGES } from '../../constants';
import Pagination from '../../components/common/Pagination';
import ConfirmationModal from '../../components/common/ConfirmationModal';

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
  
  // Confirmation modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [doctorToAction, setDoctorToAction] = useState<Doctor | null>(null);
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

  // Reset to first page when filters change
  useEffect(() => {
    setOffset(0);
  }, [approvalFilter, specialtyFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchDoctors();
  }, [approvalFilter, specialtyFilter, statusFilter, offset]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params: any = {
        offset: offset,
        limit: limit
      };
      if (searchTerm) params.search = searchTerm;
      if (approvalFilter !== 'all') params.approved = approvalFilter === 'approved';
      if (specialtyFilter) params.specialty = specialtyFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminService.getDoctors(params);
      // Backend returns { doctors, pagination }, so we need to extract the doctors array
      const doctorsData = response.data?.doctors || response.data || [];
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTORS_FAILED);
      console.error('Error fetching doctors:', error);
      setDoctors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    fetchDoctors();
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleRejectClick = (doctor: Doctor) => {
    setDoctorToAction(doctor);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!doctorToAction) return;
    setIsProcessing(true);
    try {
      await adminService.rejectDoctor(doctorToAction._id);
      toast.success(TOAST_MESSAGES.DOCTOR_REJECTED_SUCCESS);
      setShowRejectModal(false);
      setDoctorToAction(null);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_REJECT_FAILED);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendClick = (doctor: Doctor) => {
    setDoctorToAction(doctor);
    setShowSuspendModal(true);
  };

  const handleSuspend = async () => {
    if (!doctorToAction) return;
    setIsProcessing(true);
    try {
      await adminService.suspendDoctor(doctorToAction._id);
      toast.success(TOAST_MESSAGES.DOCTOR_SUSPENDED_SUCCESS);
      setShowSuspendModal(false);
      setDoctorToAction(null);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_SUSPEND_FAILED);
    } finally {
      setIsProcessing(false);
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

  const handleDeleteClick = (doctor: Doctor) => {
    setDoctorToAction(doctor);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!doctorToAction) return;
    setIsProcessing(true);
    try {
      await adminService.deleteDoctor(doctorToAction._id);
      toast.success(TOAST_MESSAGES.DOCTOR_DELETED_SUCCESS);
      setShowDeleteModal(false);
      setDoctorToAction(null);
      fetchDoctors();
    } catch (error) {
      toast.error(TOAST_MESSAGES.DOCTOR_DELETE_FAILED);
    } finally {
      setIsProcessing(false);
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
    if (!Array.isArray(doctors) || doctors.length === 0) {
      toast.error('No doctors data to export');
      return;
    }
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
  const specialties = Array.isArray(doctors) 
    ? Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).sort()
    : [];

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
                                  handleRejectClick(doctor);
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
                                  handleSuspendClick(doctor);
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
                                handleDeleteClick(doctor);
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

      {/* Doctor Details Modal */}
      {showDetails && selectedDoctor && selectedDoctor.doctor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Doctor Details</h2>
                  <p className="text-primary-100 text-sm">Complete Profile Information</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(95vh-80px)]">
              {/* Profile Header */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {selectedDoctor.doctor.userId?.profileImage ? (
                      <img
                        src={selectedDoctor.doctor.userId.profileImage}
                        alt={`${selectedDoctor.doctor.userId.firstName} ${selectedDoctor.doctor.userId.lastName}`}
                        className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                        {selectedDoctor.doctor.userId?.firstName?.[0]}{selectedDoctor.doctor.userId?.lastName?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-3xl font-bold text-gray-900">
                          Dr. {selectedDoctor.doctor.userId?.firstName} {selectedDoctor.doctor.userId?.lastName}
                        </h3>
                        <Badge variant={selectedDoctor.doctor.isApproved ? 'success' : 'warning'}>
                          {selectedDoctor.doctor.isApproved ? 'Approved' : 'Pending'}
                        </Badge>
                        <Badge variant={selectedDoctor.doctor.userId?.isActive ? 'success' : 'danger'}>
                          {selectedDoctor.doctor.userId?.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </div>
                      <p className="text-primary-600 font-semibold text-lg mb-4">{selectedDoctor.doctor.specialization}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-primary-500" />
                          <span className="text-sm">{selectedDoctor.doctor.userId?.email}</span>
                        </div>
                        {selectedDoctor.doctor.userId?.phone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-primary-500" />
                            <span className="text-sm">{selectedDoctor.doctor.userId.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-700">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-semibold">{selectedDoctor.doctor.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-sm text-gray-500">({selectedDoctor.doctor.totalReviews || 0} reviews)</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Briefcase className="w-4 h-4 text-primary-500" />
                          <span className="text-sm">{selectedDoctor.doctor.experience || 0} years experience</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Cards */}
              {selectedDoctor.stats && (
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    Performance Statistics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-3xl font-bold text-blue-600 mb-1">{selectedDoctor.stats?.totalAppointments || 0}</p>
                      <p className="text-sm font-medium text-gray-700">Total Appointments</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-3xl font-bold text-green-600 mb-1">{selectedDoctor.stats?.totalPatients || 0}</p>
                      <p className="text-sm font-medium text-gray-700">Total Patients</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border-2 border-yellow-200 text-center">
                      <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-white fill-white" />
                      </div>
                      <p className="text-3xl font-bold text-yellow-600 mb-1">{selectedDoctor.stats?.reviews || 0}</p>
                      <p className="text-sm font-medium text-gray-700">Total Reviews</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="mb-8">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                  <h4 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary-500" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">License Number</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">{selectedDoctor.doctor.licenseNumber}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Consultation Fee</p>
                      <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                        <IndianRupee className="w-5 h-5" />
                        {selectedDoctor.doctor.consultationFee}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Consultation Duration</p>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        {selectedDoctor.doctor.consultationDuration || 30} minutes
                      </p>
                    </div>
                    {selectedDoctor.doctor.userId?.dateOfBirth && (
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Date of Birth</p>
                        <p className="text-sm font-bold text-gray-900">
                          {format(new Date(selectedDoctor.doctor.userId.dateOfBirth), 'dd MMM yyyy')}
                        </p>
                      </div>
                    )}
                    {selectedDoctor.doctor.userId?.gender && (
                      <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Gender</p>
                        <p className="text-sm font-bold text-gray-900 capitalize">{selectedDoctor.doctor.userId.gender}</p>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Registration Date</p>
                      <p className="text-sm font-bold text-gray-900">
                        {selectedDoctor.doctor.userId?.createdAt 
                          ? format(new Date(selectedDoctor.doctor.userId.createdAt), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedDoctor.doctor.userId?.address && (selectedDoctor.doctor.userId.address.street || selectedDoctor.doctor.userId.address.city) && (
                <div className="mb-8">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-500" />
                      Address
                    </h4>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <p className="text-gray-700">
                        {selectedDoctor.doctor.userId.address.street && `${selectedDoctor.doctor.userId.address.street}, `}
                        {selectedDoctor.doctor.userId.address.city && `${selectedDoctor.doctor.userId.address.city}, `}
                        {selectedDoctor.doctor.userId.address.state && `${selectedDoctor.doctor.userId.address.state} `}
                        {selectedDoctor.doctor.userId.address.zipCode && `- ${selectedDoctor.doctor.userId.address.zipCode}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Biography */}
              {selectedDoctor.doctor.biography && (
                <div className="mb-8">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-500" />
                      Biography
                    </h4>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedDoctor.doctor.biography}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedDoctor.doctor.education && selectedDoctor.doctor.education.length > 0 && (
                <div className="mb-8">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary-500" />
                      Education
                    </h4>
                    <div className="space-y-3">
                      {selectedDoctor.doctor.education.map((edu: any, index: number) => (
                        <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="font-semibold text-gray-900 mb-1">{edu.degree}</p>
                          <p className="text-gray-700 mb-1">{edu.institution}</p>
                          {edu.year && <p className="text-sm text-gray-600">Year: <span className="font-medium">{edu.year}</span></p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedDoctor.doctor.languages && selectedDoctor.doctor.languages.length > 0 && (
                <div className="mb-8">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.doctor.languages.map((lang: string, index: number) => (
                        <span key={index} className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium border border-primary-200">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedDoctor.doctor.certifications && selectedDoctor.doctor.certifications.length > 0 && (
                <div className="mb-8">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-500" />
                      Certifications
                    </h4>
                    <div className="space-y-3">
                      {selectedDoctor.doctor.certifications.map((cert: any, index: number) => (
                        <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="font-semibold text-gray-900 mb-2">{cert.name}</p>
                          {cert.issuingOrganization && (
                            <p className="text-gray-700 mb-1">{cert.issuingOrganization}</p>
                          )}
                          {cert.certificateNumber && (
                            <p className="text-sm text-gray-600 font-mono mb-2">{cert.certificateNumber}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            {cert.issueDate && (
                              <span>Issued: <span className="font-medium">{format(new Date(cert.issueDate), 'dd MMM yyyy')}</span></span>
                            )}
                            {cert.expiryDate && (
                              <span>Expires: <span className="font-medium">{format(new Date(cert.expiryDate), 'dd MMM yyyy')}</span></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
          setDoctorToAction(null);
        }}
        onConfirm={handleSuspend}
        title="Suspend Doctor"
        message={`Are you sure you want to suspend Dr. ${doctorToAction?.userId.firstName} ${doctorToAction?.userId.lastName}? This will prevent them from accessing their account.`}
        confirmText="Suspend Doctor"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDoctorToAction(null);
        }}
        onConfirm={handleDelete}
        title="Delete Doctor"
        message={`Are you sure you want to delete Dr. ${doctorToAction?.userId.firstName} ${doctorToAction?.userId.lastName}? This will soft delete the doctor profile and cannot be undone.`}
        confirmText="Delete Doctor"
        cancelText="Cancel"
        type="danger"
        isLoading={isProcessing}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setDoctorToAction(null);
        }}
        onConfirm={handleReject}
        title="Reject Doctor"
        message={`Are you sure you want to reject Dr. ${doctorToAction?.userId.firstName} ${doctorToAction?.userId.lastName}? This will soft delete their profile.`}
        confirmText="Reject Doctor"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  );
}
