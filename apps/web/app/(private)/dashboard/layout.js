import { Outlet } from "react-router";

export const metadata = {
  title: "Dashboard",
};

export default function Layout({ children }) {
  return (
    <div className="py-2 sm:py-6 max-w-full mx-auto">
      {children ?? <Outlet />}
    </div>
  );
}
