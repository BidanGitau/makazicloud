"use client";

import { useState } from "react";
import { usePathname } from "@/app/_hooks/navigation";
import Link from "@/app/_components/AppLink";
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/app/_context/AuthContext";
import Logo from "./Logo";

export default function Header({
  title,
  subtitle,
  actions,
  showSearch = true,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Auto-generate title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;

    const path = pathname.split("/").pop();
    return path
      ? path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ")
      : "Dashboard";
  };

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
  };

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          {/* Left Section - Logo & Title */}
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Logo */}
            <div className="hidden lg:block">
              <Logo />
            </div>

            {/* Page Title */}
            <div className="flex-1 lg:flex-none">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Center Section - Search */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties, tenants, payments..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-500"
                />
              </div>
            </div>
          )}

          {/* Right Section - Actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Custom Actions */}
            {actions && (
              <div className="hidden sm:flex items-center gap-2">{actions}</div>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600  rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.firstName?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role || "Manager"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/settings/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile Settings
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Account Settings
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden px-4 pb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-500"
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-blue-900/50"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="absolute top-0 left-0 w-64 h-full bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <Logo />
            </div>
            {/* Mobile menu content would go here */}
          </div>
        </div>
      )}
    </>
  );
}
