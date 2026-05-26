import { Outlet } from "react-router";


export const metadata = {
  title: "Tenants - Dashboard",
  description: "Manage all tenants and their details in your dashboard.",
  openGraph: {
    title: "Tenants - Dashboard",
    description: "Manage tenants and their details.",
  },
  twitter: {
    card: "summary",
    title: "Tenants - Dashboard",
  },
};

export default function TenantsLayout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
