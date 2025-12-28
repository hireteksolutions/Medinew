import { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import DatePickerComponent from '../../components/common/DatePicker';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  FileSpreadsheet,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { exportToPDF as exportPDFUtil } from '../../utils/exportUtils';

const COLORS = ['#0066CC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<any>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [appointmentStats, setAppointmentStats] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [doctorPerformance, setDoctorPerformance] = useState<any[]>([]);
  const [patientSatisfaction, setPatientSatisfaction] = useState<any>(null);
  const [peakHours, setPeakHours] = useState<any>(null);
  const [cancellationAnalysis, setCancellationAnalysis] = useState<any>(null);
  const [noShowAnalysis, setNoShowAnalysis] = useState<any>(null);

  useEffect(() => {
    fetchAllReports();
  }, [dateRange, startDate, endDate]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const params: any = {
        dateRange: dateRange === 'custom' ? 'custom' : dateRange,
        ...(dateRange === 'custom' && { startDate, endDate })
      };

      // Fetch all reports in parallel for better performance
      const [
        statsResponse,
        specialtiesResponse,
        appointmentStatsResponse,
        revenueStatsResponse,
        doctorPerformanceResponse,
        patientSatisfactionResponse,
        peakHoursResponse,
        cancellationResponse,
        noShowResponse
      ] = await Promise.all([
        adminService.getStats(),
        adminService.getMostBookedSpecialties(params),
        adminService.getAppointmentStatistics(params),
        adminService.getRevenueStatistics(params),
        adminService.getDoctorPerformance(params),
        adminService.getPatientSatisfaction(params),
        adminService.getPeakHours(params),
        adminService.getCancellationAnalysis(params),
        adminService.getNoShowAnalysis(params)
      ]);

      setReportData(statsResponse.data);
      setSpecialties(specialtiesResponse.data);
      setAppointmentStats(appointmentStatsResponse.data);
      setRevenueStats(revenueStatsResponse.data);
      setDoctorPerformance(doctorPerformanceResponse.data);
      setPatientSatisfaction(patientSatisfactionResponse.data);
      setPeakHours(peakHoursResponse.data);
      setCancellationAnalysis(cancellationResponse.data);
      setNoShowAnalysis(noShowResponse.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error(TOAST_MESSAGES.LOADING_REPORTS_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();
    switch (range) {
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(startOfMonth(subMonths(today, 12)), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const exportToPDF = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Patients', (reportData?.overview?.totalPatients || 0).toString()],
      ['Total Doctors', (reportData?.overview?.totalDoctors || 0).toString()],
      ['Total Appointments', (reportData?.appointments?.total || 0).toString()],
      ['Total Revenue', `₹${reportData?.revenue?.total?.toFixed(2) || '0.00'}`],
      ['Pending Appointments', (reportData?.appointments?.pending || 0).toString()],
      ['Completed Appointments', (reportData?.appointments?.completed || 0).toString()],
      ['Cancelled Appointments', (reportData?.appointments?.cancelled || 0).toString()],
    ];

    exportPDFUtil({
      headers,
      rows,
      title: 'System Reports & Analytics',
      filename: `reports_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    });
    toast.success(TOAST_MESSAGES.PDF_EXPORT_GENERATED_SUCCESS);
  };

  const exportToExcel = () => {
    // Create a comprehensive CSV/Excel export
    const data = [
      ['Report Type', 'Value'],
      ['Total Patients', reportData?.overview?.totalPatients || 0],
      ['Total Doctors', reportData?.overview?.totalDoctors || 0],
      ['Total Appointments', reportData?.appointments?.total || 0],
      ['Total Revenue', `₹${reportData?.revenue?.total?.toFixed(2) || '0.00'}`],
      ['Pending Appointments', reportData?.appointments?.pending || 0],
      ['Completed Appointments', reportData?.appointments?.completed || 0],
      ['Cancelled Appointments', reportData?.appointments?.cancelled || 0],
    ];

    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(TOAST_MESSAGES.EXPORT_GENERATED_SUCCESS);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Format chart data
  const appointmentTrendsData = reportData?.trends?.appointmentTrends?.map((item: any) => ({
    date: `${item._id.month}/${item._id.day}`,
    appointments: item.count
  })) || [];

  const userGrowthData = reportData?.trends?.userGrowth?.reduce((acc: any, item: any) => {
    const date = `${item._id.month}/${item._id.day}`;
    if (!acc[date]) {
      acc[date] = { date, patients: 0, doctors: 0 };
    }
    if (item._id.role === 'patient') acc[date].patients = item.count;
    if (item._id.role === 'doctor') acc[date].doctors = item.count;
    return acc;
  }, {}) || [];
  const userGrowthChartData = Object.values(userGrowthData);

  const specialtyData = specialties?.map((item: any) => ({
    name: item.specialization,
    value: item.appointmentCount
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive system analytics and reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button onClick={exportToPDF} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDateRangeChange('week')}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === 'week' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('month')}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === 'month' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => handleDateRangeChange('year')}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === 'year' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Last Year
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === 'custom' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Custom
              </button>
            </div>
          </div>
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <DatePickerComponent
                  selected={startDate ? new Date(startDate) : null}
                  onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholderText="Start Date"
                  dateFormat="MM/dd/yyyy"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <DatePickerComponent
                  selected={endDate ? new Date(endDate) : null}
                  onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholderText="End Date"
                  dateFormat="MM/dd/yyyy"
                  minDate={startDate ? new Date(startDate) : undefined}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900">
                ₹{revenueStats?.total?.toFixed(2) || '0.00'}
              </p>
            </div>
            <span className="text-3xl font-bold text-blue-500">₹</span>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Total Appointments</p>
              <p className="text-2xl font-bold text-green-900">
                {appointmentStats?.total || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Active Users</p>
              <p className="text-2xl font-bold text-purple-900">
                {reportData?.overview?.totalPatients + reportData?.overview?.totalDoctors || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1">Avg. Response Time</p>
              <p className="text-2xl font-bold text-amber-900">--</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Appointment Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointmentTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#0066CC" name="Appointments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Growth
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userGrowthChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="patients" fill="#10B981" name="Patients" />
              <Bar dataKey="doctors" fill="#F59E0B" name="Doctors" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Booked Specialties */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Most Booked Specialties
          </h3>
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
      </div>

      {/* Detailed Statistics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Statistics */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Appointment Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Appointments</span>
              <span className="font-semibold">{appointmentStats?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">
                {appointmentStats?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">
                {appointmentStats?.completed || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancelled</span>
              <span className="font-semibold text-red-600">
                {appointmentStats?.cancelled || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="font-semibold">{appointmentStats?.today || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="font-semibold">{appointmentStats?.thisWeek || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold">{appointmentStats?.thisMonth || 0}</span>
            </div>
          </div>
        </div>

        {/* Revenue Statistics */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Revenue Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold text-green-600">
                ₹{revenueStats?.total?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="font-semibold">
                ₹{revenueStats?.today?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="font-semibold">
                ₹{revenueStats?.thisWeek?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold">
                ₹{revenueStats?.thisMonth?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Performance Report */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Doctor Performance Report
          </h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              Top performing doctors by appointments and ratings
            </div>
            {doctorPerformance && doctorPerformance.length > 0 ? (
              <div className="space-y-2">
                {doctorPerformance.slice(0, 5).map((doc: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium">{doc.doctorName}</span>
                      <span className="text-xs text-gray-500 block">{doc.specialization}</span>
                    </div>
                    <span className="text-sm text-gray-600">{doc.totalAppointments} appointments</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Patient Satisfaction Report */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Patient Satisfaction Report
          </h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              Overall patient satisfaction metrics
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Total Reviews</span>
                <span className="text-sm text-gray-600">{patientSatisfaction?.totalReviews || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Average Rating</span>
                <span className="text-sm text-gray-600">{patientSatisfaction?.averageRating?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Satisfaction Rate</span>
                <span className="text-sm text-gray-600">{patientSatisfaction?.satisfactionRate || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Peak Hours & Busy Periods */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Peak Hours & Busy Periods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Busiest Days of the Week</h4>
            <div className="space-y-2">
              {peakHours?.busyDays && peakHours.busyDays.length > 0 ? (
                peakHours.busyDays.map((day: any, index: number) => {
                  const maxCount = Math.max(...peakHours.busyDays.map((d: any) => d.count));
                  const percentage = maxCount > 0 ? (day.count / maxCount * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{day.day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{day.count}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Peak Hours</h4>
            <div className="space-y-2">
              {peakHours?.peakHours && peakHours.peakHours.length > 0 ? (
                peakHours.peakHours.slice(0, 6).map((hour: any, index: number) => {
                  const maxCount = Math.max(...peakHours.peakHours.map((h: any) => h.count));
                  const percentage = maxCount > 0 ? (hour.count / maxCount * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{hour.time}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{hour.count}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation & No-Show Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Cancellation Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Cancelled</span>
              <span className="font-semibold text-red-600">
                {cancellationAnalysis?.totalCancelled || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancellation Rate</span>
              <span className="font-semibold">
                {cancellationAnalysis?.cancellationRate?.toFixed(1) || '0.0'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold">{cancellationAnalysis?.thisMonthRate?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                Monitor cancellation trends to identify patterns and improve appointment adherence
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            No-Show Rate Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total No-Shows</span>
              <span className="font-semibold text-orange-600">{noShowAnalysis?.totalNoShows || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">No-Show Rate</span>
              <span className="font-semibold">{noShowAnalysis?.noShowRate?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold">{noShowAnalysis?.thisMonthRate?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-700">
                Track no-show rates to optimize scheduling and reduce resource waste
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

