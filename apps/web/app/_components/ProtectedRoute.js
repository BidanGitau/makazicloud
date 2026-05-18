"use client";

import { useAuth } from "@/app/_context/AuthContext";
import { useRouter } from "@/app/_hooks/navigation";
import { useEffect } from "react";
import { DEFAULT_UNAUTH_REDIRECT } from "@/app/_lib/routes";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // No user - redirect to login
    if (!user) {
      router.replace(DEFAULT_UNAUTH_REDIRECT);
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show redirecting message while redirect happens
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated - render children
  return children;
}
