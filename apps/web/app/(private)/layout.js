"use client";

import { Navigate, Outlet } from "react-router";
import { usePathname } from "@/app/_hooks/navigation";
import SideNavigation from "@/app/_components/SideNavigation";
import TopNavigation from "@/app/_components/TopNavigation";
import QuickAccessBar from "@/app/_components/QuickAccessBar";
import SessionTimeoutModal from "@/app/_components/SessionTimeoutModal";
import { useAuth } from "@/app/_context/AuthContext";
import { useSessionTimeout } from "@/app/_hooks/useSessionTimeout";
import { CustomToastContainer } from "@/app/_components/CustomToast";
import {
  getFirstAllowedRoute,
  getRequiredPlanForPath,
  getRequiredPermissionForPath,
} from "@/app/_lib/routes";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";

export default function PrivateLayout({ children }) {
  const { user, loading, logout, permissions, hasPermission } = useAuth();
  const pathname = usePathname();
  const { showWarning, secondsLeft, stayLoggedIn } = useSessionTimeout(logout);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsPasswordSetup) {
    return <Navigate to="/reset-password?mode=invite" replace />;
  }
  if (user.accountType === ACCOUNT_TYPE.TENANT) {
    return <Navigate to="/tenant-portal" replace />;
  }

  const requiredPermission = getRequiredPermissionForPath(pathname);
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Navigate
        to={getFirstAllowedRoute(permissions, user.subscription?.planId)}
        replace
      />
    );
  }

  const allowedPlans = getRequiredPlanForPath(pathname);
  const planId = user.subscription?.planId || "free";
  if (allowedPlans?.length && !allowedPlans.includes(planId)) {
    return <Navigate to={getFirstAllowedRoute(permissions, planId)} replace />;
  }

  return (
    <>
      <CustomToastContainer />
      {showWarning && (
        <SessionTimeoutModal
          secondsLeft={secondsLeft}
          onStay={stayLoggedIn}
          onLogout={logout}
        />
      )}
      <div className="h-screen bg-white flex overflow-hidden text-black">
        <div className="flex-shrink-0">
          <SideNavigation />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden pl-16 lg:pl-0">
          <div className="flex-shrink-0">
            <TopNavigation user={user} onLogout={logout} />
          </div>
          <QuickAccessBar />
          <main className="flex-1 overflow-y-auto w-full">
            <div className="w-full max-w-none p-3 sm:p-6">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
