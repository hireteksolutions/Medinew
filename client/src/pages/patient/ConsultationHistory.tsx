import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  RefreshCw as FollowUpIcon,
  UserPlus,
  Stethoscope,
  Pill,
  Download,
  X,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import DatePickerComponent from '../../components/common/DatePicker';

export default function ConsultationHistory() {
  const { showLoader, hideLoader } = useLoader();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showSwitchDoctorModal, setShowSwitchDoctorModal] = useState(false);
  const [doctorsForSwitch, setDoctorsForSwitch] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [filters, setFilters] = useState({
    doctorId: '',
    specialization: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: ''
  });
  
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
  }, [filters.search, filters.startDate, filters.endDate, filters.doctorId, filters.specialization]);

  useEffect(() => {
    fetchConsultations();
  }, [offset, filters]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      showLoader('Loading consultation history...');
      const params: any = {
        offset: offset,
        limit: limit
      };
      
      if (filters.doctorId) params.doctorId = filters.doctorId;
      if (filters.specialization) params.specialization = filters.specialization;
      if (filters.startDate) params.startDate = format(filters.startDate, 'yyyy-MM-dd');
      if (filters.endDate) params.endDate = format(filters.endDate, 'yyyy-MM-dd');
      if (filters.search) params.search = filters.search;

      const response = await patientService.getConsultationHistory(params);
      const consultationsData = response.data?.consultations || response.data || [];
      setConsultations(Array.isArray(consultationsData) ? consultationsData : []);
      
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load consultation history');
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = async (consultation: any) => {
    try {
      showLoader('Loading consultation details...');
      const response = await patientService.getConsultationDetails(consultation._id);
      setSelectedConsultation(response.data?.consultation || consultation);
      setShowDetailsModal(true);
      setOpenDropdownId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load details');
    } finally {
      hideLoader();
    }
  };

  const handleBookFollowUp = async (consultation: any) => {
    try {
      showLoader('Loading consultation details...');
      const response = await patientService.getConsultationDetails(consultation._id);
      setSelectedConsultation(response.data?.consultation || consultation);
      setShowFollowUpModal(true);
      setOpenDropdownId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load details');
    } finally {
      hideLoader();
    }
  };

  const handleSwitchDoctor = async (consultation: any) => {
    try {
      setLoadingDoctors(true);
      const response = await patientService.getDoctorsForSwitch({
        appointmentId: consultation._id,
        sameSpecialization: true
      });
      setDoctorsForSwitch(response.data?.doctors || []);
      setSelectedConsultation(consultation);
      setShowSwitchDoctorModal(true);
      setOpenDropdownId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleBookWithDoctor = (doctor: any) => {
    navigate(`/book-appointment?doctorId=${doctor.userId._id}&previousAppointmentId=${selectedConsultation?._id}&isFollowUp=true`);
    setShowSwitchDoctorModal(false);
  };

  const handleBookFollowUpClick = () => {
    if (selectedConsultation) {
      navigate(`/book-appointment?doctorId=${selectedConsultation.doctorId._id}&previousAppointmentId=${selectedConsultation._id}&isFollowUp=true`);
      setShowFollowUpModal(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      doctorId: '',
      specialization: '',
      startDate: null,
      endDate: null,
      search: ''
    });
    setOffset(0);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultation History</h1>
          <p className="text-gray-600 mt-1">View your complete medical consultation history</p>
        </div>
        <button
          onClick={fetchConsultations}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by diagnosis, symptoms..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <DatePickerComponent
              selected={filters.startDate}
              onChange={(date) => setFilters({ ...filters, startDate: date })}
              placeholderText="Select start date"
              dateFormat="MM/dd/yyyy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <DatePickerComponent
              selected={filters.endDate}
              onChange={(date) => setFilters({ ...filters, endDate: date })}
              placeholderText="Select end date"
              dateFormat="MM/dd/yyyy"
              minDate={filters.startDate || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={clearFilters}
            className="btn-secondary whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading consultation history...</p>
        </div>
      ) : consultations.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No consultations found</p>
          <p className="text-gray-400 text-sm">Your completed consultations will appear here</p>
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Diagnosis</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consultations.map((consultation) => (
                  <tr key={consultation._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {consultation.doctorId?.profileImage ? (
                          <img
                            src={consultation.doctorId.profileImage}
                            alt={consultation.doctorId.firstName}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {consultation.doctorId?.firstName?.[0] || 'D'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Dr. {consultation.doctorId?.firstName} {consultation.doctorId?.lastName}
                          </div>
                          {consultation.reasonForVisit && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {consultation.reasonForVisit}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center font-medium">
                          <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                          <span>{format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-gray-500 mt-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary-500 mr-1.5 flex-shrink-0" />
                          <span className="text-xs">{consultation.timeSlot?.start} - {consultation.timeSlot?.end}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary-600 font-medium">
                        {consultation.doctorId?.specialization}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {consultation.diagnosis || (
                          <span className="text-gray-400 italic">No diagnosis recorded</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {consultation.isFollowUp && (
                          <Badge variant="info">Follow-up</Badge>
                        )}
                        {consultation.isEmergency && (
                          <Badge variant="danger">Emergency</Badge>
                        )}
                        {!consultation.isFollowUp && !consultation.isEmergency && (
                          <Badge variant="success">Regular</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative flex justify-end" ref={(el) => (dropdownRefs.current[consultation._id] = el)} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === consultation._id ? null : consultation._id)}
                          className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openDropdownId === consultation._id && (
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                            <button
                              onClick={() => handleViewDetails(consultation)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={() => handleBookFollowUp(consultation)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors text-left"
                            >
                              <FollowUpIcon className="w-4 h-4" />
                              <span>Book Follow-up</span>
                            </button>
                            <button
                              onClick={() => handleSwitchDoctor(consultation)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors text-left"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Switch Doctor</span>
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
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Pagination
                total={pagination.total}
                limit={pagination.limit || limit}
                offset={pagination.offset || offset}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-2xl font-bold">Consultation Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Doctor Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                {selectedConsultation.doctorId?.profileImage ? (
                  <img
                    src={selectedConsultation.doctorId.profileImage}
                    alt={selectedConsultation.doctorId.firstName}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-2xl border-4 border-primary-100">
                    {selectedConsultation.doctorId?.firstName?.[0] || 'D'}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}
                  </h3>
                  <p className="text-primary-600 font-medium">{selectedConsultation.doctorId?.specialization}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(selectedConsultation.appointmentDate), 'MMMM d, yyyy')} at {selectedConsultation.timeSlot?.start}
                  </p>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Appointment Date</p>
                  <p className="text-sm text-gray-900">{format(new Date(selectedConsultation.appointmentDate), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Time Slot</p>
                  <p className="text-sm text-gray-900">{selectedConsultation.timeSlot?.start} - {selectedConsultation.timeSlot?.end}</p>
                </div>
              </div>

              {/* Reason for Visit */}
              {selectedConsultation.reasonForVisit && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    Reason for Visit
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedConsultation.reasonForVisit}</p>
                </div>
              )}

              {/* Symptoms */}
              {selectedConsultation.symptoms && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Symptoms</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{selectedConsultation.symptoms}</p>
                </div>
              )}

              {/* Diagnosis */}
              {selectedConsultation.diagnosis && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary-500" />
                    Diagnosis
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedConsultation.diagnosis}</p>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedConsultation.doctorNotes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Doctor Notes</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{selectedConsultation.doctorNotes}</p>
                </div>
              )}

              {/* Prescription */}
              {selectedConsultation.prescription && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary-500" />
                    Prescription
                  </h4>
                  {selectedConsultation.prescription.medications && selectedConsultation.prescription.medications.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedConsultation.prescription.medications.map((med: any, idx: number) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                            {med.dosage && <span><strong>Dosage:</strong> {med.dosage}</span>}
                            {med.frequency && <span><strong>Frequency:</strong> {med.frequency}</span>}
                            {med.duration && <span><strong>Duration:</strong> {med.duration}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedConsultation.prescription.notes && (
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedConsultation.prescription.notes}</p>
                  )}
                </div>
              )}

              {/* Test Reports */}
              {selectedConsultation.testReports && selectedConsultation.testReports.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Test Reports</h4>
                  <div className="space-y-2">
                    {selectedConsultation.testReports.map((report: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{report.testName || report.fileName}</p>
                          {report.testDate && (
                            <p className="text-sm text-gray-600 mt-1">
                              {format(new Date(report.testDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        {report.fileUrl && (
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up Info */}
              {selectedConsultation.followUpRequired && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-900">Follow-up Required</h4>
                  </div>
                  {selectedConsultation.followUpDate && (
                    <p className="text-yellow-800">
                      Recommended follow-up date: {format(new Date(selectedConsultation.followUpDate), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button onClick={() => setShowDetailsModal(false)} className="btn-secondary">
                Close
              </button>
              <button onClick={() => {
                setShowDetailsModal(false);
                handleBookFollowUp(selectedConsultation);
              }} className="btn-primary flex items-center gap-2">
                <FollowUpIcon className="w-4 h-4" />
                Book Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Booking Modal */}
      {showFollowUpModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowFollowUpModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-2xl font-bold">Book Follow-up Appointment</h2>
              <button onClick={() => setShowFollowUpModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Previous Consultation Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Previous Consultation Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700"><strong>Doctor:</strong> Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700"><strong>Date:</strong> {format(new Date(selectedConsultation.appointmentDate), 'MMMM d, yyyy')}</span>
                  </div>
                  {selectedConsultation.diagnosis && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span className="text-gray-700"><strong>Diagnosis:</strong> {selectedConsultation.diagnosis}</span>
                    </div>
                  )}
                  {selectedConsultation.reasonForVisit && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span className="text-gray-700"><strong>Reason:</strong> {selectedConsultation.reasonForVisit}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Continue with:</strong> Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}
                </p>
                <p className="text-sm text-primary-600 font-medium">{selectedConsultation.doctorId?.specialization}</p>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button onClick={() => setShowFollowUpModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleBookFollowUpClick} className="btn-primary flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Continue Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Doctor Modal */}
      {showSwitchDoctorModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowSwitchDoctorModal(false)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center sticky top-0">
              <div>
                <h2 className="text-2xl font-bold">Switch Doctor</h2>
                <p className="text-sm text-purple-100 mt-1">Choose a different doctor for your consultation</p>
              </div>
              <button onClick={() => setShowSwitchDoctorModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {/* Previous Consultation Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Previous Consultation</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Doctor:</strong> Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}</p>
                  <p><strong>Specialization:</strong> {selectedConsultation.doctorId?.specialization}</p>
                  {selectedConsultation.diagnosis && (
                    <p><strong>Diagnosis:</strong> {selectedConsultation.diagnosis}</p>
                  )}
                </div>
              </div>

              {loadingDoctors ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading doctors...</p>
                </div>
              ) : doctorsForSwitch.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No doctors available in the same specialization</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-4">Available Doctors (Same Specialization)</h3>
                  {doctorsForSwitch.map((doctor) => (
                    <div key={doctor._id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {doctor.userId?.profileImage ? (
                            <img
                              src={doctor.userId.profileImage}
                              alt={doctor.userId.firstName}
                              className="w-16 h-16 rounded-full object-cover border-2 border-purple-100"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xl border-2 border-purple-100">
                              {doctor.userId?.firstName?.[0] || 'D'}
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              Dr. {doctor.userId?.firstName} {doctor.userId?.lastName}
                            </h4>
                            <p className="text-sm text-purple-600 font-medium mb-1">{doctor.specialization}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                {doctor.rating?.toFixed(1) || 'N/A'} ({doctor.totalReviews || 0} reviews)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-green-600 font-semibold">₹</span>
                                {doctor.consultationFee}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBookWithDoctor(doctor)}
                          className="btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                          Book Appointment
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
