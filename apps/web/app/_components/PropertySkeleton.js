"use client";

import React from "react";

const PropertyCardSkeleton = () => {
  const Skeleton = ({ className = "", width = "w-full", height = "h-4" }) => (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md ${width} ${height} ${className}`}
      style={{ animation: "shimmer 2s infinite ease-in-out" }}
    />
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
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-700 hover:shadow-2xl hover:scale-[1.02]">

        <div className="relative h-64 bg-gradient-to-br from-blue-200 via-blue-100 to-blue-200 overflow-hidden">
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
          <div className="absolute top-4 right-4">
            <Skeleton width="w-16" height="h-6" className="rounded-full" />
          </div>
          <div className="absolute bottom-4 left-4">
            <Skeleton width="w-20" height="h-8" className="rounded-lg" />
          </div>
        </div>


        <div className="p-8 space-y-6">

          <div className="space-y-3">
            <Skeleton width="w-3/4" height="h-7" />
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <Skeleton width="w-1/2" height="h-4" />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="text-center space-y-2">
                <Skeleton width="w-12" height="h-8" className="mx-auto" />
                <Skeleton width="w-16" height="h-3" className="mx-auto" />
              </div>
            ))}
          </div>


          <div className="space-y-3">
            <Skeleton width="w-24" height="h-4" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  width="w-20"
                  height="h-6"
                  className="rounded-full"
                />
              ))}
            </div>
          </div>


          <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-300 to-blue-300 rounded-full animate-pulse" />
            <div className="space-y-1">
              <Skeleton width="w-24" height="h-4" />
              <Skeleton width="w-16" height="h-3" />
            </div>
          </div>


          <div className="pt-4">
            <Skeleton width="w-full" height="h-12" className="rounded-xl" />
          </div>
        </div>
      </div>
    </>
  );
};

const PropertyPageSkeleton = ({ cards = 6 }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 font-sans">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">

        <div className="relative mb-16">
          <div className="absolute inset-0 -skew-y-1 bg-gradient-to-r from-blue-100/50 via-white/70 to-blue-100/50 pointer-events-none rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-6 py-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-4">
              <div className="w-4 h-4 bg-blue-300 rounded animate-pulse mr-2" />
              <div className="w-32 h-4 bg-blue-200 rounded animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="w-96 h-12 bg-gray-200 rounded-lg mx-auto animate-pulse" />
              <div className="w-80 h-6 bg-gray-200 rounded mx-auto animate-pulse" />
              <div className="w-72 h-6 bg-gray-200 rounded mx-auto animate-pulse" />
            </div>


            <div className="max-w-2xl mx-auto mt-8">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="w-32 h-12 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="w-32 h-12 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>


            <div className="flex flex-wrap items-center justify-center gap-8 mt-8">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
                  <div className="w-4 h-4 bg-blue-300 rounded animate-pulse" />
                  <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {Array.from({ length: cards }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export { PropertyCardSkeleton, PropertyPageSkeleton };
export default PropertyPageSkeleton;
