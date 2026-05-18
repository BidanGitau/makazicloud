import { Outlet } from "react-router";

// ./app/dashboard/Arrears/layout.js
export const metadata = {
  title: "Arrears - Dashboard",
};

export default function ArrearsLayout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
