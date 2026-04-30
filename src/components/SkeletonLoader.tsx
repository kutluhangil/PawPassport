import React from 'react';

export const CardSkeleton = () => (
  <div className="premium-frame animate-pulse">
    <div className="premium-frame-content bg-gray-200 dark:bg-white/5 h-full min-h-[300px]">
      <div className="aspect-square bg-gray-300 dark:bg-white/10" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-1/2" />
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex justify-between">
          <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-gray-300 dark:bg-white/10 rounded w-4" />
        </div>
      </div>
    </div>
  </div>
);

export const SubjectSkeleton = () => (
  <div className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse">
    <div className="w-12 h-12 rounded-lg bg-gray-300 dark:bg-white/10" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-300 dark:bg-white/10 rounded w-1/2" />
      <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-1/4" />
    </div>
  </div>
);
