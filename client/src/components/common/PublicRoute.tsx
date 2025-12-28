import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath, USER_ROLES } from '../../constants';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component
 * Redirects authenticated users to their dashboard
 * Allows unauthenticated users to access public pages (login, register, etc.)
 * Allows authenticated admins to access register page for adding doctors/patients
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Allow authenticated admins to access register page (for adding doctors/patients)
  if (user && location.pathname === '/register' && user.role === USER_ROLES.ADMIN) {
    return <>{children}</>;
  }

  // If user is authenticated, redirect to their dashboard
  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
};

