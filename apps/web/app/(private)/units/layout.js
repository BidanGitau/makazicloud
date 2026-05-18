import { Outlet } from "react-router";

// ./app/dashboard/units/layout.js
export const metadata = {
  title: "Units - Dashboard",
  description: "Manage all units and their details in your dashboard.",
  openGraph: {
    title: "Units - Dashboard",
    description: "Manage units and their details.",
  },
  twitter: {
    card: "summary",
    title: "Units - Dashboard",
  },
};

export default function UnitsLayout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
