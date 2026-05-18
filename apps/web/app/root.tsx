import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { ConfigProvider } from "antd";

import "@/app/_styles/globals.css";
import { AuthProvider } from "@/app/_context/AuthContext";

const FONT_SANS =
  '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const BRAND = "#0369a1"; // sky-700 — refined brand blue (single source: --brand in globals.css)
const BRAND_HOVER = "#075985"; // sky-800

const antdTheme = {
  token: {
    colorPrimary: BRAND,
    colorLink: BRAND,
    colorLinkHover: BRAND_HOVER,
    colorInfo: BRAND,
    colorBgBase: "#ffffff",
    colorTextBase: "#0f172a",
    borderRadius: 0,
    borderRadiusLG: 0,
    borderRadiusSM: 0,
    borderRadiusXS: 0,
    fontFamily: FONT_SANS,
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Button: { borderRadius: 0, controlHeight: 40, fontWeight: 600 },
    Input: { borderRadius: 0, controlHeight: 40 },
    Select: { borderRadius: 0, controlHeight: 40 },
    DatePicker: { borderRadius: 0, controlHeight: 40 },
    Modal: { borderRadiusLG: 0 },
    Card: { borderRadiusLG: 0 },
    Table: { borderRadius: 0, headerBg: "#fafaf9" },
    Tag: { borderRadiusSM: 0 },
    Pagination: { borderRadius: 0 },
  },
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans antialiased text-black min-h-screen overflow-x-hidden">
        <ConfigProvider theme={antdTheme}>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function meta() {
  return [
    { title: "Welcome / MakaziCloud" },
    {
      name: "description",
      content:
        "Professional rental management solution for property owners and clients",
    },
  ];
}

export default function App() {
  return <Outlet />;
}
