import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../constants';

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-danger-100 rounded-full mb-4">
              <ShieldX className="w-10 h-10 text-danger-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-8">
              You don't have permission to access this resource. This page is restricted to specific user roles.
            </p>
          </div>

          <div className="space-y-4">
            {user ? (
              <Link
                to={getDashboardPath(user.role)}
                className="inline-flex items-center justify-center w-full bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition"
              >
                <Home className="w-5 h-5 mr-2" />
                Go to My Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go to Login
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

