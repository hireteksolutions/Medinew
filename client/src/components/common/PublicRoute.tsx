import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../constants';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component
 * Redirects authenticated users to their dashboard
 * Allows unauthenticated users to access public pages (login, register, etc.)
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to their dashboard
  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
};

