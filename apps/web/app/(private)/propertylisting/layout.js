import { Outlet } from "react-router";


export const metadata = {
  title: "Properties - Dashboard",
  description: "Manage all properties and listings in your dashboard.",
  openGraph: {
    title: "Properties - Dashboard",
    description: "View and manage all property listings and details.",
  },
  twitter: {
    card: "summary",
    title: "Properties - Dashboard",
  },
};

export default function PropertiesLayout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
