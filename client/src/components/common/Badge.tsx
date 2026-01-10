import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'orange' | 'purple' | 'indigo' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 border border-gray-300 font-semibold',
  success: 'bg-emerald-100 text-emerald-800 border border-emerald-400 font-semibold',
  warning: 'bg-amber-100 text-amber-800 border border-amber-400 font-semibold',
  danger: 'bg-red-100 text-red-800 border border-red-400 font-semibold',
  info: 'bg-blue-100 text-blue-800 border border-blue-400 font-semibold',
  secondary: 'bg-slate-700 text-white border border-slate-800 font-semibold',
  orange: 'bg-orange-100 text-orange-800 border border-orange-400 font-semibold',
  purple: 'bg-violet-100 text-violet-800 border border-violet-400 font-semibold',
  indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-400 font-semibold',
  teal: 'bg-teal-100 text-teal-800 border border-teal-400 font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

