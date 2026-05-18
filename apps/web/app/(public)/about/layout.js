import { Outlet } from "react-router";

// ./app/dashboard/Tenants/layout.js
export const metadata = {};

export default function AboutLayout({ children }) {
  return <div className="py-6 max-w-full mx-auto">{children ?? <Outlet />}</div>;
}
