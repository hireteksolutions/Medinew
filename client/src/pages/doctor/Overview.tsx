import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorDashboardService } from '../../services/api';
import { Calendar, Users, Star } from 'lucide-react';

export default function Overview() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalPatients: 0,
    completedAppointments: 0,
    avgRating: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await doctorDashboardService.getStats();
      setStats(response.data);
    } catch (error) {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Appointments</p>
              <p className="text-2xl font-bold text-primary-500">{stats.todayAppointments}</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Patients</p>
              <p className="text-2xl font-bold text-primary-500">{stats.totalPatients}</p>
            </div>
            <Users className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Rating</p>
              <p className="text-2xl font-bold text-primary-500">{stats.avgRating.toFixed(1)}</p>
            </div>
            <Star className="w-8 h-8 text-primary-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-4">Total Appointments</h2>
          <p className="text-3xl font-bold text-primary-500">{stats.totalAppointments}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-4">Completed Appointments</h2>
          <p className="text-3xl font-bold text-success-500">{stats.completedAppointments}</p>
        </div>
      </div>
    </div>
  );
}

