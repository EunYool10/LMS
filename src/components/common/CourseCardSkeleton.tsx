import React from 'react';

export const CourseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="aspect-video w-full bg-slate-200 relative">
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <div className="w-10 h-4 bg-slate-300 rounded-md" />
          <div className="w-14 h-4 bg-slate-300 rounded-md" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-slate-300 rounded-full" />
      </div>

      {/* Body Skeleton */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-4/5" />
          <div className="h-4 bg-slate-200 rounded w-3/5" />
          <div className="h-3 bg-slate-100 rounded w-full pt-1" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-3 bg-slate-200 rounded w-14" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="h-6 bg-slate-200 rounded-lg w-16" />
            <div className="h-7 bg-slate-200 rounded-xl w-20" />
          </div>
        </div>
      </div>
    </div>
  );
};
