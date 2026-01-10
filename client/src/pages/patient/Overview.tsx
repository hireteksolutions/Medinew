import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, FileText, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { patientService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import { APPOINTMENT_STATUSES, getAppointmentStatusColor, DASHBOARD_ROUTES } from '../../constants';
import Badge from '../../components/common/Badge';
import { getAppointmentBadgeVariant, toTitleCase } from '../../utils/badgeUtils';

export default function Overview() {
  const { showLoader, hideLoader } = useLoader();
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    totalAppointments: 0,
    medicalRecords: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      showLoader('Loading dashboard data...');
      // Fetch upcoming appointments, all appointments, and medical records
      const [upcomingRes, allAppointmentsRes, recordsRes] = await Promise.all([
        patientService.getAppointments({ upcoming: 'true' }),
        patientService.getAppointments(),
        patientService.getMedicalRecords(),
      ]);

      // Extract data from responses (Axios wraps in .data)
      // Handle paginated response structure: { appointments: [...], pagination: {...} }
      const upcomingAppointments = upcomingRes.data?.appointments || (Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
      const allAppointments = allAppointmentsRes.data?.appointments || (Array.isArray(allAppointmentsRes.data) ? allAppointmentsRes.data : []);
      const medicalRecords = recordsRes.data?.records || (Array.isArray(recordsRes.data) ? recordsRes.data : []);

      console.log('Overview Data:', {
        upcoming: upcomingAppointments.length,
        total: allAppointments.length,
        records: medicalRecords.length
      });

      setUpcomingAppointments(upcomingAppointments.slice(0, 5));
      setStats({
        upcomingAppointments: upcomingAppointments.length,
        totalAppointments: allAppointments.length,
        medicalRecords: medicalRecords.length,
      });
    } catch (error: any) {
      console.error('Error fetching overview data:', error);
      console.error('Error details:', error.response?.data);
      // Set defaults on error
      setStats({
        upcomingAppointments: 0,
        totalAppointments: 0,
        medicalRecords: 0,
      });
      setUpcomingAppointments([]);
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Upcoming Appointments</p>
              <p className="text-3xl font-bold text-primary-500">{stats.upcomingAppointments}</p>
            </div>
            <Calendar className="w-12 h-12 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-primary-500">{stats.totalAppointments}</p>
            </div>
            <Clock className="w-12 h-12 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Medical Records</p>
              <p className="text-3xl font-bold text-primary-500">{stats.medicalRecords}</p>
            </div>
            <FileText className="w-12 h-12 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Upcoming Appointments</h2>
            <Link 
              to={DASHBOARD_ROUTES.PATIENT.APPOINTMENTS} 
              className="text-white hover:text-gray-100 flex items-center gap-2 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading appointments...</p>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No upcoming appointments</p>
            <Link 
              to="/doctors" 
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              <span>Book an appointment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Appointment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingAppointments.map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {appointment.doctorId.profileImage ? (
                          <img
                            src={appointment.doctorId.profileImage}
                            alt={appointment.doctorId.firstName}
                            className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-primary-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg mr-4 border-2 border-primary-100">
                            {appointment.doctorId.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Dr. {appointment.doctorId.firstName} {appointment.doctorId.lastName}
                          </div>
                          {appointment.reasonForVisit && (
                            <div className="text-xs text-gray-500 mt-1">
                              {appointment.reasonForVisit}
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
                      <div className="text-sm text-primary-600 font-medium">
                        {appointment.doctorId.specialization}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
                        {appointment.appointmentNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getAppointmentBadgeVariant(appointment.status)}>
                        {toTitleCase(appointment.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={DASHBOARD_ROUTES.PATIENT.APPOINTMENTS}
                        className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

