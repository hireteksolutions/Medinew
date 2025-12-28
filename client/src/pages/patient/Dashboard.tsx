import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { LayoutDashboard, Calendar, FileText, Heart, User, Menu, X, LogOut } from 'lucide-react';
import { DASHBOARD_ROUTES } from '../../constants';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Overview from './Overview';
import Appointments from './Appointments';
import MedicalRecords from './MedicalRecords';
import Profile from './Profile';
import FavoriteDoctors from './FavoriteDoctors';

export default function PatientDashboard() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: DASHBOARD_ROUTES.PATIENT.OVERVIEW, icon: LayoutDashboard, label: 'Overview' },
    { path: DASHBOARD_ROUTES.PATIENT.APPOINTMENTS, icon: Calendar, label: 'Appointments' },
    { path: DASHBOARD_ROUTES.PATIENT.MEDICAL_RECORDS, icon: FileText, label: 'Medical Records' },
    { path: DASHBOARD_ROUTES.PATIENT.FAVORITE_DOCTORS, icon: Heart, label: 'Favorite Doctors' },
    { path: DASHBOARD_ROUTES.PATIENT.PROFILE, icon: User, label: 'Profile' },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  
  const userFullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mb-4 flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="font-medium">Menu</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={closeSidebar}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:shadow-md transform transition-transform duration-300 ease-in-out lg:transform-none ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="h-full overflow-y-auto p-4 lg:p-4 flex flex-col">
              {/* User Info Section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Patient Dashboard</h2>
                  <button
                    onClick={closeSidebar}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={userFullName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-lg font-semibold border-2 border-primary-600">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{userFullName}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="space-y-1 flex-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeSidebar}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white shadow-md transform scale-[1.02]'
                          : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              
              {/* Logout Button */}
              <div className="mt-auto pt-4 border-t border-gray-200">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3 min-w-0">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/medical-records" element={<MedicalRecords />} />
              <Route path="/favorite-doctors" element={<FavoriteDoctors />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

