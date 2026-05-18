"use client";

import { ArrowLeft, Calendar, Users, TrendingUp, Home } from "lucide-react";
import Link from "@/app/_components/AppLink";

export default function PageTitle({
  title,
  subtitle,
  backTo,
  stats,
  actions,
  icon,
  gradient = true,
  size = "lg",
}) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  const getIconComponent = () => {
    if (icon) return icon;

    // Default icons based on common page types
    const path = window?.location?.pathname || "";
    if (path.includes("dashboard")) return <Home className="w-8 h-8" />;
    if (path.includes("tenant")) return <Users className="w-8 h-8" />;
    if (path.includes("payment") || path.includes("arrears")) return <TrendingUp className="w-8 h-8" />;
    if (path.includes("report")) return <Calendar className="w-8 h-8" />;

    return null;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-100 opacity-50" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Back Navigation */}
          {backTo && (
            <div className="mb-6">
              <Link
                href={backTo.href}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {backTo.label}
              </Link>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              {getIconComponent() && (
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  {getIconComponent()}
                </div>
              )}

              <div>
                <h1
                  className={`${sizeClasses[size]} font-bold leading-tight ${
                    gradient
                      ? "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent"
                      : "text-gray-900"
                  }`}
                >
                  {title}
                </h1>

                {subtitle && (
                  <p className="text-lg text-gray-600 mt-2 max-w-2xl">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Actions Section */}
            {actions && (
              <div className="flex flex-wrap items-center gap-3">
                {actions}
              </div>
            )}
          </div>

          {/* Stats Section */}
          {stats && stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {stat.icon && (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bgColor || 'bg-blue-50'}`}>
                        <div className={stat.color || 'text-blue-600'}>
                          {stat.icon}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  </div>

                  {stat.change && (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${
                        stat.changeType === 'positive'
                          ? 'text-green-600'
                          : stat.changeType === 'negative'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-500">
                        {stat.changePeriod || 'vs last month'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}

// Utility component for common action buttons
export function PageTitleAction({
  children,
  variant = "primary",
  size = "md",
  ...props
}) {
  const baseClasses = "inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5";

  const variants = {
    primary: "bg-blue-600 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}
