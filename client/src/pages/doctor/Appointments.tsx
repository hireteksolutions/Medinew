import { useState, useEffect } from 'react';
import { doctorDashboardService } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, X, User, Phone, Mail, MapPin, Calendar as CalendarIcon, Droplet, AlertCircle, Pill, Heart, Activity, PhoneCall, FileText } from 'lucide-react';
import DatePickerComponent from '../../components/common/DatePicker';
import { APPOINTMENT_STATUSES, getAppointmentStatusColor, isActiveAppointment, TOAST_MESSAGES } from '../../constants';

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await doctorDashboardService.getAppointments({ date: selectedDate });
      setAppointments(response.data);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_APPOINTMENTS_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await doctorDashboardService.updateAppointment(id, { status });
      toast.success(TOAST_MESSAGES.APPOINTMENT_UPDATED_SUCCESS);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.APPOINTMENT_UPDATE_FAILED);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Appointments</h1>
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

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No appointments for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div 
              key={appointment._id} 
              className="card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedAppointment(appointment)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {appointment.patientId.profileImage ? (
                    <img
                      src={appointment.patientId.profileImage}
                      alt={appointment.patientId.firstName}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl">
                      {appointment.patientId.firstName[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {appointment.patientId.firstName} {appointment.patientId.lastName}
                    </h3>
                    <p className="text-gray-600 mb-2">{appointment.patientId.email}</p>
                    <div className="space-y-1 text-gray-600">
                      <p>
                        <strong>Time:</strong> {appointment.timeSlot.start} - {appointment.timeSlot.end}
                      </p>
                      {appointment.reasonForVisit && (
                        <p>
                          <strong>Reason:</strong> {appointment.reasonForVisit}
                        </p>
                      )}
                      {appointment.symptoms && (
                        <p>
                          <strong>Symptoms:</strong> {appointment.symptoms}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getAppointmentStatusColor(appointment.status)}`}
                  >
                    {appointment.status}
                  </span>
                  {isActiveAppointment(appointment.status) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(appointment._id, APPOINTMENT_STATUSES.COMPLETED)}
                        className="flex items-center space-x-1 text-success-500 hover:text-success-600"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appointment._id, APPOINTMENT_STATUSES.CANCELLED)}
                        className="flex items-center space-x-1 text-danger-500 hover:text-danger-600"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}

