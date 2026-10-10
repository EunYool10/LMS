import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'indigo' | 'emerald' | 'amber';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = 'md',
  variant = 'indigo',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const fillColors = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
          <span>진도율</span>
          <span className="font-semibold text-slate-800 tabular-nums">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 ${sizeClasses[size]}`}>
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${fillColors[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
