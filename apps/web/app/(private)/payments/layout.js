import { Outlet } from "react-router";

export const metadata = {
  title: "Payments - Dashboard",
  description: "Manage and track all tenant payments in your dashboard.",
  openGraph: {
    title: "Payments - Dashboard",
    description: "View and record tenant payments, methods, and references.",
  },
  twitter: {
    card: "summary",
    title: "Payments - Dashboard",
  },
};

export default function PaymentsLayout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
