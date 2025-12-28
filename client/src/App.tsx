import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LoaderProvider } from './context/LoaderContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { USER_ROLES, DASHBOARD_ROUTES } from './constants';

// Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Doctors from './pages/Doctors';
import DoctorProfile from './pages/DoctorProfile';
import BookAppointment from './pages/BookAppointment';
import Payment from './pages/Payment';
import PatientDashboard from './pages/patient/Dashboard';
import DoctorDashboard from './pages/doctor/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <AuthProvider>
      <LoaderProvider>
        <Router>
          <div className="min-h-screen">
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            
            {/* Protected Routes */}
            <Route
              path="/book-appointment/:doctorId?"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.PATIENT]}>
                  <BookAppointment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:appointmentId"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.PATIENT]}>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${DASHBOARD_ROUTES.PATIENT.BASE}/*`}
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.PATIENT]}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${DASHBOARD_ROUTES.DOCTOR.BASE}/*`}
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.DOCTOR]}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${DASHBOARD_ROUTES.ADMIN.BASE}/*`}
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#363636',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </LoaderProvider>
    </AuthProvider>
  );
}

export default App;

