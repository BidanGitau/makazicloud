import { Outlet } from "react-router";

// export const metadata = {
//   title: "Property",
// };

export default function propertyLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 mx-auto my-1 w-full rounded-2xl overflow-hidden shadow-md bg-white flex flex-col">
        <main className="flex-1 relative z-0">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
