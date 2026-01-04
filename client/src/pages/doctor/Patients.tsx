import { useState, useEffect } from 'react';
import { doctorDashboardService } from '../../services/api';
import { Users, Mail, Phone, Calendar, Search, Eye, User as UserIcon, X, Clock, FileText, IndianRupee, CreditCard, Activity, Heart, Pill, AlertCircle, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Badge from '../../components/common/Badge';
import { APPOINTMENT_STATUSES } from '../../constants';
import Pagination from '../../components/common/Pagination';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Reset to first page when search changes
  useEffect(() => {
    setOffset(0);
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients();
  }, [offset]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params: any = {
        offset: offset,
        limit: limit
      };
      const response = await doctorDashboardService.getPatients(params);
      
      // Handle paginated response structure: { patients: [...], pagination: {...} }
      let patientsData: any[] = [];
      if (response.data?.patients) {
        patientsData = response.data.patients;
      } else if (Array.isArray(response.data)) {
        patientsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        patientsData = response.data.data;
      }
      
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load patients';
      toast.error(errorMessage);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPatients = patients.filter((patient: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower) ||
      patient.phone?.toLowerCase().includes(searchLower)
    );
  });

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

  const calculateTotalPaid = (appointments: any[]) => {
    if (!Array.isArray(appointments)) return 0;
    return appointments.reduce((total, appointment) => {
      if (!appointment.payment || !appointment.payment.amount) {
        return total;
      }

      const payment = appointment.payment;
      const status = payment.status?.toLowerCase();
      const gateway = payment.paymentGateway?.toLowerCase();

      // Count payments that are:
      // 1. Completed (regardless of gateway)
      // 2. Pay at Clinic (offline gateway - expected to be paid)
      // 3. Online payments (online gateway - if not failed/cancelled)
      const shouldCount = 
        status === 'completed' || 
        (gateway === 'offline') || // Pay at Clinic - expected payment
        (gateway === 'online' && status !== 'failed' && status !== 'cancelled' && status !== 'refunded');

      if (shouldCount) {
        return total + payment.amount;
      }
      return total;
    }, 0);
  };

  const handleViewPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    try {
      const response = await doctorDashboardService.getPatientHistory(patient._id);
      // API returns { patient: {...}, appointments: [...] }
      const appointments = response.data?.appointments || response.data?.data?.appointments || [];
      setPatientHistory(Array.isArray(appointments) ? appointments : []);
      
      // Update patient data if available from API
      if (response.data?.patient) {
        setSelectedPatient({
          ...patient,
          ...response.data.patient
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load patient history');
      setPatientHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Patients</h1>
          <p className="text-gray-600 mt-1">View and manage all your patients</p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading patients...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {searchTerm ? 'No patients found matching your search' : 'No patients yet'}
          </p>
          <p className="text-gray-400 text-sm">
            {!searchTerm && 'Patients will appear here after they book appointments with you'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date of Birth</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient: any) => (
                  <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {patient.profileImage ? (
                          <img
                            src={patient.profileImage}
                            alt={patient.firstName}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {patient.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{patient.email}</span>
                        </div>
                        {patient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-xs">{patient.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.dateOfBirth ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                          <span>{format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.gender ? (
                        <Badge variant="secondary">
                          <span className="capitalize">{patient.gender}</span>
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewPatient(patient)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        title="View Patient History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
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
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPatient(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Patient Details</h2>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Patient Basic Info */}
              <div className="mb-6">
                <div className="flex items-start space-x-4 mb-4">
                  {selectedPatient.profileImage ? (
                    <img
                      src={selectedPatient.profileImage}
                      alt={selectedPatient.firstName}
                      className="w-24 h-24 rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl">
                      {selectedPatient.firstName[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-5 h-5" />
                        <span>{selectedPatient.email}</span>
                      </div>
                      {selectedPatient.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="w-5 h-5" />
                          <span>{selectedPatient.phone}</span>
                        </div>
                      )}
                      {selectedPatient.dateOfBirth && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-5 h-5" />
                          <span>DOB: {format(new Date(selectedPatient.dateOfBirth), 'MMMM d, yyyy')}</span>
                        </div>
                      )}
                      {selectedPatient.gender && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <UserIcon className="w-5 h-5" />
                          <span className="capitalize">{selectedPatient.gender}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information & BMI Section */}
              <div className="border-t pt-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* BMI Data */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Scale className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-semibold text-gray-900">BMI & Physical Data</h4>
                    </div>
                    <div className="space-y-3">
                      {selectedPatient.bmi !== undefined && selectedPatient.bmi !== null ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">BMI:</span>
                          <span className="text-lg font-bold text-blue-700">
                            {selectedPatient.bmi.toFixed(1)}
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              {selectedPatient.bmi < 18.5 ? '(Underweight)' :
                               selectedPatient.bmi < 25 ? '(Normal)' :
                               selectedPatient.bmi < 30 ? '(Overweight)' : '(Obese)'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">BMI: Not available</div>
                      )}
                      {selectedPatient.height !== undefined && selectedPatient.height !== null ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Height:</span>
                          <span className="text-base font-semibold text-gray-900">
                            {selectedPatient.height} cm
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Height: Not available</div>
                      )}
                      {selectedPatient.weight !== undefined && selectedPatient.weight !== null ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Weight:</span>
                          <span className="text-base font-semibold text-gray-900">
                            {selectedPatient.weight} kg
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Weight: Not available</div>
                      )}
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-5 h-5 text-green-600" />
                      <h4 className="text-lg font-semibold text-gray-900">Medical Information</h4>
                    </div>
                    <div className="space-y-3">
                      {selectedPatient.bloodGroup ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Blood Group:</span>
                          <Badge variant="info" className="font-semibold">
                            {selectedPatient.bloodGroup}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Blood Group: Not available</div>
                      )}
                      {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Allergies:</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.allergies.map((allergy: string, index: number) => (
                              <Badge key={index} variant="warning" className="text-xs">
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Allergies: None recorded</div>
                      )}
                      {selectedPatient.currentMedications && selectedPatient.currentMedications.length > 0 ? (
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Current Medications:</span>
                          <div className="space-y-1">
                            {selectedPatient.currentMedications.slice(0, 3).map((med: any, index: number) => (
                              <div key={index} className="text-xs text-gray-700 bg-white/50 rounded px-2 py-1">
                                <span className="font-medium">{med.name}</span>
                                {med.dosage && <span className="text-gray-500"> - {med.dosage}</span>}
                              </div>
                            ))}
                            {selectedPatient.currentMedications.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{selectedPatient.currentMedications.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Current Medications: None</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Health Conditions */}
              <div className="border-t pt-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary-600" />
                  <h4 className="text-xl font-semibold">Common Health Conditions</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chronic Conditions */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <h5 className="font-semibold text-gray-900">Chronic Conditions</h5>
                    </div>
                    {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.chronicConditions.map((condition: any, index: number) => (
                          <div key={index} className="bg-white rounded p-3 border border-gray-200">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-medium text-gray-900">{condition.condition}</span>
                              {condition.severity && (
                                <Badge 
                                  variant={
                                    condition.severity === 'severe' ? 'danger' :
                                    condition.severity === 'moderate' ? 'warning' : 'info'
                                  }
                                  className="text-xs"
                                >
                                  {condition.severity}
                                </Badge>
                              )}
                            </div>
                            {condition.diagnosisDate && (
                              <div className="text-xs text-gray-500 mb-1">
                                Diagnosed: {format(new Date(condition.diagnosisDate), 'MMM d, yyyy')}
                              </div>
                            )}
                            {condition.notes && (
                              <div className="text-xs text-gray-600 mt-1">{condition.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No chronic conditions recorded</div>
                    )}
                  </div>

                  {/* Medical History */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h5 className="font-semibold text-gray-900">Medical History</h5>
                    </div>
                    {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.medicalHistory.map((history: any, index: number) => (
                          <div key={index} className="bg-white rounded p-3 border border-gray-200">
                            <div className="font-medium text-gray-900 mb-1">{history.condition}</div>
                            {history.diagnosisDate && (
                              <div className="text-xs text-gray-500 mb-1">
                                {format(new Date(history.diagnosisDate), 'MMM d, yyyy')}
                              </div>
                            )}
                            {history.notes && (
                              <div className="text-xs text-gray-600 mt-1">{history.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No medical history recorded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment History */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Appointment History
                  </h4>
                  {Array.isArray(patientHistory) && patientHistory.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                      <IndianRupee className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-600">Total Paid:</span>
                      <span className="text-lg font-bold text-green-700">{calculateTotalPaid(patientHistory)}</span>
                    </div>
                  )}
                </div>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading history...</p>
                  </div>
                ) : !Array.isArray(patientHistory) || patientHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No appointment history found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Date & Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Appointment ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Mode</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {patientHistory.map((appointment: any) => (
                          <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="flex items-center font-medium">
                                  <Calendar className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0" />
                                  <span>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center text-gray-500 mt-1.5">
                                  <Clock className="w-3.5 h-3.5 text-primary-500 mr-1.5 flex-shrink-0" />
                                  <span className="text-xs">{appointment.timeSlot?.start} - {appointment.timeSlot?.end}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 font-mono text-xs">
                                {appointment.appointmentNumber || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  appointment.status === APPOINTMENT_STATUSES.CONFIRMED ? 'success' :
                                  appointment.status === APPOINTMENT_STATUSES.COMPLETED ? 'info' :
                                  appointment.status === APPOINTMENT_STATUSES.CANCELLED ? 'danger' :
                                  'warning'
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-600 max-w-xs">
                                {appointment.reasonForVisit || appointment.symptoms || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {getPaymentStatusBadge(appointment.payment)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {appointment.payment ? (
                                  appointment.payment.paymentGateway === 'offline' ? (
                                    <span className="flex items-center gap-1">
                                      <CreditCard className="w-4 h-4" />
                                      <span>Pay at Clinic</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <CreditCard className="w-4 h-4" />
                                      <span>Online</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {appointment.payment && appointment.payment.amount ? (
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-semibold text-gray-900">{appointment.payment.amount}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

