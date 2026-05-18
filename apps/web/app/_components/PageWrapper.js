"use client";

import { useState, useEffect } from "react";
import { usePathname } from "@/app/_hooks/navigation";

export default function PageWrapper({
  children,
  title,
  subtitle,
  actions,
  className = "",
  containerClass = "",
  showTitle = true,
  maxWidth = "full",
  flexLayout = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Auto-generate title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;

    const path = pathname.split("/").pop();
    return path
      ? path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ")
      : "Dashboard";
  };

  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-none",
  };

  return (
    <div
      className={`${flexLayout ? 'h-screen flex flex-col' : 'min-h-full'} bg-white overflow-x-hidden ${className}`}
    >
      <div
        className={`${
          flexLayout
            ? 'flex-1 flex flex-col overflow-hidden'
            : 'w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'
        } ${flexLayout ? '' : maxWidthClasses[maxWidth]} ${containerClass}`}
      >
        {/* Page Header */}
        {showTitle && (
          <div
            className={`${
              flexLayout ? 'px-4 sm:px-6 lg:px-8 py-4' : 'mb-8'
            } transform transition-all duration-700 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  {getPageTitle()}
                </h1>
                {subtitle && (
                  <p className="text-lg text-gray-600 mt-2 max-w-3xl">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Actions */}
              {actions && (
                <div className="flex flex-wrap items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div
          className={`${
            flexLayout ? 'flex-1 overflow-hidden' : ''
          } w-full transform transition-all duration-700 delay-200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Utility components for consistent page elements

export function PageSection({
  children,
  title,
  subtitle,
  className = "",
  contentClass = "",
  headerActions,
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
            {subtitle && (
              <p className="text-gray-600 text-sm">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      )}
      <div className={`w-full ${contentClass}`}>{children}</div>
    </section>
  );
}

export function PageCard({
  children,
  className = "",
  padding = "p-6",
  shadow = "shadow-lg",
  hover = true,
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 ${shadow} ${padding} ${
        hover ? "hover:shadow-xl" : ""
      } transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageGrid({
  children,
  columns = "auto-fit",
  minWidth = "280px",
  gap = "gap-6",
  className = "",
}) {
  const gridClasses = {
    "auto-fit": `grid-template-columns: repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  const gridClass = typeof columns === "number" ? gridClasses[columns] : "";
  const style = columns === "auto-fit" ? { gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))` } : {};

  return (
    <div
      className={`grid ${gridClass} ${gap} w-full ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function PageAction({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const baseClasses = "inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const variants = {
    primary: "bg-blue-600 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}

export function PageTable({
  children,
  className = "",
  responsive = true,
}) {
  if (responsive) {
    return (
      <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <div className={`overflow-hidden shadow-lg border border-gray-200 rounded-2xl ${className}`}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden shadow-lg border border-gray-200 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function PageStats({
  stats,
  columns = "auto",
  className = "",
}) {
  const columnClasses = {
    auto: "grid-cols-2 lg:grid-cols-4",
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={`grid ${columnClasses[columns]} gap-4 lg:gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-2">
            {stat.icon && (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bgColor || 'bg-blue-50'}`}>
                <div className={stat.color || 'text-blue-600'}>
                  {stat.icon}
                </div>
              </div>
            )}
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          </div>

          {stat.change && (
            <div className="flex items-center gap-1 mt-2">
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
  );
}
