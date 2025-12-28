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
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
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
              <p className="text-gray-600 mb-1">Today's Appointments</p>
              <p className="text-3xl font-bold text-primary-500">{stats.todayAppointments}</p>
            </div>
            <Calendar className="w-12 h-12 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Total Patients</p>
              <p className="text-3xl font-bold text-primary-500">{stats.totalPatients}</p>
            </div>
            <Users className="w-12 h-12 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-primary-500">{stats.avgRating.toFixed(1)}</p>
            </div>
            <Star className="w-12 h-12 text-primary-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Total Appointments</h2>
          <p className="text-4xl font-bold text-primary-500">{stats.totalAppointments}</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Completed Appointments</h2>
          <p className="text-4xl font-bold text-success-500">{stats.completedAppointments}</p>
        </div>
      </div>
    </div>
  );
}

