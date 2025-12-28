import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';
import { UserRole, TOAST_MESSAGES } from '../constants';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ requiresApproval?: boolean; message?: string } | undefined>;
  logout: () => void;
  updateUser: (user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  dateOfBirth?: string;
  gender?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      authService.setAuthToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      // Server returns 'accessToken' not 'token'
      const newToken = response.data.accessToken || response.data.token;
      const newUser = response.data.user;
      
      if (!newToken || !newUser) {
        throw new Error('Invalid login response');
      }
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      authService.setAuthToken(newToken);
      
      toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.LOGIN_FAILED);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      
      // Check if doctor registration requires approval
      if (response.data.requiresApproval) {
        // Don't set token or user for doctors - they need approval
        toast.success(response.data.message || TOAST_MESSAGES.REGISTRATION_SUCCESS_PENDING);
        return { requiresApproval: true, message: response.data.message };
      }
      
      // Server returns 'accessToken' not 'token'
      const newToken = response.data.accessToken || response.data.token;
      const newUser = response.data.user;
      
      if (!newToken || !newUser) {
        throw new Error('Invalid registration response');
      }
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      authService.setAuthToken(newToken);
      
      toast.success(TOAST_MESSAGES.REGISTRATION_SUCCESS);
      return { requiresApproval: false };
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.REGISTRATION_FAILED);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authService.setAuthToken(null);
    toast.success(TOAST_MESSAGES.LOGOUT_SUCCESS);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

