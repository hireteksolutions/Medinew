import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { patientService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../constants';
import { TOAST_MESSAGES } from '../../constants/messages';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  doctorId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ doctorId, className = '', size = 'md' }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if doctor is already in favorites
  useEffect(() => {
    if (user && user.role === USER_ROLES.PATIENT && doctorId) {
      checkFavoriteStatus();
    } else {
      setChecking(false);
    }
  }, [user, doctorId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await patientService.getFavoriteDoctors();
      const favoriteDoctors = response.data || [];
      // Check if doctor is in favorites by comparing userId._id (since we pass userId._id)
      const isFav = favoriteDoctors.some(
        (doctor: any) => 
          (doctor.userId?._id && doctor.userId._id.toString() === doctorId.toString()) ||
          (doctor._id && doctor._id.toString() === doctorId.toString())
      );
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || user.role !== USER_ROLES.PATIENT) {
      toast.error('Please login as a patient to add favorites');
      return;
    }

    if (loading || checking) return;

    setLoading(true);
    try {
      if (isFavorite) {
        await patientService.removeFavoriteDoctor(doctorId);
        setIsFavorite(false);
        toast.success(TOAST_MESSAGES.REMOVED_FROM_FAVORITES);
      } else {
        await patientService.addFavoriteDoctor(doctorId);
        setIsFavorite(true);
        toast.success(TOAST_MESSAGES.ADDED_TO_FAVORITES);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(
        isFavorite
          ? TOAST_MESSAGES.REMOVE_FROM_FAVORITES_FAILED
          : TOAST_MESSAGES.ADD_TO_FAVORITES_FAILED
      );
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if user is not a patient
  if (!user || user.role !== USER_ROLES.PATIENT) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading || checking}
      className={`${className} transition-colors ${
        isFavorite
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-400 hover:text-red-500'
      } ${loading || checking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`${sizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
      />
    </button>
  );
}

