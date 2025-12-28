import { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  Activity,
  BarChart3,
  UserPlus,
  FileText,
  Settings,
  Download,
  Bell,
  FileArchive,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DASHBOARD_ROUTES } from '../../constants';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0066CC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12">Failed to load statistics</div>;
  }

  // Format data for charts
  const appointmentTrendsData = stats.trends?.appointmentTrends?.map((item: any) => ({
    date: `${item._id.month}/${item._id.day}`,
    count: item.count
  })) || [];

  const userGrowthData = stats.trends?.userGrowth?.reduce((acc: any, item: any) => {
    const date = `${item._id.month}/${item._id.day}`;
    if (!acc[date]) {
      acc[date] = { date, patients: 0, doctors: 0 };
    }
    if (item._id.role === 'patient') acc[date].patients = item.count;
    if (item._id.role === 'doctor') acc[date].doctors = item.count;
    return acc;
  }, {}) || [];
  const userGrowthChartData = Object.values(userGrowthData);

  const specialtyData = stats.specialties?.mostBooked?.map((item: any) => ({
    name: item.specialization,
    value: item.appointmentCount
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
          <p className="text-gray-600 mt-1">Monitor your healthcare system at a glance</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/register?role=doctor"
            className="btn-secondary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Doctor
          </Link>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Patients</p>
              <p className="text-3xl font-bold text-blue-900">{stats.overview.totalPatients}</p>
              <p className="text-xs text-blue-600 mt-1">Active users</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Total Doctors</p>
              <p className="text-3xl font-bold text-green-900">{stats.overview.totalDoctors}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats.overview.pendingDoctorVerifications} pending approval
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-purple-900">{stats.appointments.total}</p>
              <p className="text-xs text-purple-600 mt-1">
                {stats.appointments.today} today
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-amber-900">₹{stats.revenue.total.toFixed(2)}</p>
              <p className="text-xs text-amber-600 mt-1">
                ₹{stats.revenue.thisMonth.toFixed(2)} this month
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">₹</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Appointment Status</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <span className="text-xl font-bold text-yellow-600">{stats.appointments.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="text-xl font-bold text-green-600">{stats.appointments.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancelled</span>
              <span className="text-xl font-bold text-red-600">{stats.appointments.cancelled}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Appointments by Period</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="text-xl font-bold text-primary-600">{stats.appointments.today}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="text-xl font-bold text-primary-600">{stats.appointments.thisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="text-xl font-bold text-primary-600">{stats.appointments.thisMonth}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue by Period</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="text-xl font-bold text-primary-600">₹{stats.revenue.today.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="text-xl font-bold text-primary-600">₹{stats.revenue.thisWeek.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="text-xl font-bold text-primary-600">₹{stats.revenue.thisMonth.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Appointment Trends (Last 7 Days)</h3>
          {appointmentTrendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appointmentTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#0066CC" strokeWidth={2} name="Appointments" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* User Growth Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">User Growth (Last 30 Days)</h3>
          {userGrowthChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowthChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="patients" fill="#10B981" name="Patients" />
                <Bar dataKey="doctors" fill="#0066CC" name="Doctors" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Most Booked Specialties */}
      {specialtyData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Most Booked Specialties</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={specialtyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {specialtyData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to={`${DASHBOARD_ROUTES.ADMIN.DOCTORS}?filter=pending`}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">Approve Pending Doctors</p>
              <p className="text-sm text-gray-600">Review and approve doctor registrations</p>
            </div>
          </Link>
          <button
            onClick={() => {
              // TODO: Implement notification modal
              toast.info(TOAST_MESSAGES.NOTIFICATION_FEATURE_COMING_SOON);
            }}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Bell className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">Send Notifications</p>
              <p className="text-sm text-gray-600">Send system-wide notifications</p>
            </div>
          </button>
          <Link
            to={DASHBOARD_ROUTES.ADMIN.REPORTS}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">Export Reports</p>
              <p className="text-sm text-gray-600">Generate and download reports</p>
            </div>
          </Link>
          <button
            onClick={() => {
              // TODO: Implement system logs view
              toast.info(TOAST_MESSAGES.SYSTEM_LOGS_FEATURE_COMING_SOON);
            }}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Eye className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">View System Logs</p>
              <p className="text-sm text-gray-600">Monitor system activity logs</p>
            </div>
          </button>
          <Link
            to={DASHBOARD_ROUTES.ADMIN.PATIENTS}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">Manage Patients</p>
              <p className="text-sm text-gray-600">View and manage patient accounts</p>
            </div>
          </Link>
          <Link
            to={DASHBOARD_ROUTES.ADMIN.APPOINTMENTS}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">View Appointments</p>
              <p className="text-sm text-gray-600">Monitor all appointments</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
