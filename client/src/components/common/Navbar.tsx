import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { PROJECT_CONFIG } from '../../config';
import { NotificationDropdown } from './NotificationDropdown';
import { USER_ROLES, getDashboardPath } from '../../constants';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) {
      e.preventDefault();
      // Redirect to dashboard based on user role
      const dashboardRoute = getDashboardPath(user.role);
      navigate(dashboardRoute);
    }
    // If no user, let the default Link behavior navigate to home page
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link 
            to={user ? getDashboardPath(user.role) : "/"} 
            onClick={handleLogoClick}
            className="flex items-center space-x-2"
          >
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">{PROJECT_CONFIG.shortName}</span>
            </div>
            <span className="text-xl font-bold text-primary-500">{PROJECT_CONFIG.name}</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {!user && (
              <>
                <Link to="/" className="text-gray-700 hover:text-primary-500 transition">Home</Link>
                <Link to="/doctors" className="text-gray-700 hover:text-primary-500 transition">Doctors</Link>
                <Link to="/services" className="text-gray-700 hover:text-primary-500 transition">Services</Link>
                <Link to="/about" className="text-gray-700 hover:text-primary-500 transition">About</Link>
                <Link to="/contact" className="text-gray-700 hover:text-primary-500 transition">Contact</Link>
              </>
            )}

            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationDropdown />
                <div className="flex items-center space-x-2">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.firstName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                      {user.firstName[0]}
                    </div>
                  )}
                  <span className="text-gray-700">{user.firstName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-500 transition"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {!user && (
              <>
                <Link to="/" className="block text-gray-700 hover:text-primary-500">Home</Link>
                <Link to="/doctors" className="block text-gray-700 hover:text-primary-500">Doctors</Link>
                <Link to="/services" className="block text-gray-700 hover:text-primary-500">Services</Link>
                <Link to="/about" className="block text-gray-700 hover:text-primary-500">About</Link>
                <Link to="/contact" className="block text-gray-700 hover:text-primary-500">Contact</Link>
              </>
            )}
            
            {user ? (
              <>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-gray-700 hover:text-primary-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-gray-700 hover:text-primary-500">Login</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

