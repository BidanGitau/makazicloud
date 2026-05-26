"use client";

import React from "react";

const LoadingSkeleton = ({
  rows = 5,
  columns = 6,
  showHeader = true,
  className = "",
}) => {
  const Skeleton = ({ className = "", width = "w-full", height = "h-4" }) => (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md ${width} ${height} ${className}`}
      style={{ animation: "shimmer 2s infinite ease-in-out" }}
    />
  );

  const SkeletonRow = ({ isFirst = false }) => (
    <tr
      className={`border-b border-gray-100 ${isFirst ? "bg-blue-50/30" : "hover:bg-gray-50"} transition-colors`}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <div className="flex items-center space-x-3">
            {index === 0 && (
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-200 via-blue-100 to-blue-100 rounded-full animate-pulse flex-shrink-0" />
                <div className="absolute inset-2 bg-gradient-to-br from-blue-300 to-blue-300 rounded-full animate-pulse opacity-60" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Skeleton
                width={
                  index === 0
                    ? "w-28"
                    : index === 1
                      ? "w-24"
                      : index === 2
                        ? "w-20"
                        : index === columns - 1
                          ? "w-16"
                          : "w-32"
                }
                height="h-4"
              />
              {(index === 0 || index === 1) && (
                <Skeleton width="w-20" height="h-3" className="opacity-60" />
              )}
            </div>
          </div>
        </td>
      ))}
    </tr>
  );

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {showHeader && (
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b-2 border-gray-200">
                <tr>
                  {Array.from({ length: columns }).map((_, index) => (
                    <th key={index} className="px-6 py-4 text-left">
                      <Skeleton
                        width={
                          index === 0
                            ? "w-24"
                            : index === 1
                              ? "w-20"
                              : index === columns - 1
                                ? "w-12"
                                : "w-28"
                        }
                        height="h-5"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: rows }).map((_, index) => (
                <SkeletonRow key={index} isFirst={index === 0} />
              ))}
            </tbody>
          </table>
        </div>


        <div className="flex items-center justify-center py-4 bg-gray-50/50 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading data...</span>
          </div>
        </div>
      </div>
    </>
  );
};

export const StatisticsSkeleton = ({ cards = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {Array.from({ length: cards }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded" />
          </div>
          <div className="w-16 h-6 bg-gray-200 rounded mb-1" />
          <div className="w-24 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const FiltersSkeleton = () => (
  <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
    <div className="flex-1 min-w-[200px]">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="min-w-[150px]">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="min-w-[150px]">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="min-w-[150px]">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
    </div>
  </div>
);

export const ModalSkeleton = ({ lines = 8 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className="space-y-2">
        <div className="w-24 h-4 bg-gray-200 rounded" />
        <div
          className={`h-4 bg-gray-200 rounded ${
            index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-3/4" : "w-1/2"
          }`}
        />
      </div>
    ))}
  </div>
);

export const PageHeaderSkeleton = () => (
  <div className="flex justify-between items-center animate-pulse">
    <div>
      <div className="w-32 h-8 bg-gray-200 rounded mb-2" />
      <div className="w-48 h-4 bg-gray-200 rounded" />
    </div>
    <div className="w-32 h-10 bg-gray-200 rounded" />
  </div>
);


export const DashboardSkeleton = () => (
  <div className="w-full space-y-6 py-6 animate-pulse">

    <div>
      <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-200 rounded" />
    </div>


    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-2xl h-32" />
      ))}
    </div>


    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-gray-200 rounded-2xl h-72" />
      <div className="bg-gray-200 rounded-2xl h-72" />
    </div>


    <div className="bg-gray-200 rounded-2xl h-64" />
  </div>
);


export const PageSkeleton = ({ cards = 0, hasFilters = false }) => (
  <div className="p-6 space-y-6 animate-pulse">

    <div className="flex justify-between items-center">
      <div className="h-8 w-32 bg-gray-200 rounded" />
      <div className="h-10 w-28 bg-gray-200 rounded-xl" />
    </div>


    {hasFilters && (
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-36 bg-gray-200 rounded" />
        ))}
      </div>
    )}


    {cards > 0 && (
      <div
        className={`grid grid-cols-2 md:grid-cols-${Math.min(cards, 4)} gap-4`}
      >
        {[...Array(cards)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-20" />
        ))}
      </div>
    )}


    <div className="bg-gray-200 rounded-xl h-80" />
  </div>
);

export default LoadingSkeleton;
