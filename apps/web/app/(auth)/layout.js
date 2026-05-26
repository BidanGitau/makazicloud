"use client";

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import Link from "@/app/_components/AppLink";
import { ArrowLeft, Shield, Users, Zap } from "lucide-react";
import Logo from "@/app/_components/Logo";
import { useAuth } from "@/app/_context/AuthContext";
import { DEFAULT_AUTH_REDIRECT } from "@/app/_lib/routes";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";

const TRUST = [
  { icon: Shield, label: "Encrypted" },
  { icon: Users, label: "2,000+ Users" },
  { icon: Zap, label: "M-Pesa Ready" },
];


const KEEP_AUTHED_PATHS = new Set([
  "/accept-invite",
  "/accept-tenant-invite",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
]);

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();


  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shouldBounce = !loading && !!user && !KEEP_AUTHED_PATHS.has(pathname);
  const authedRedirect =
    user?.accountType === ACCOUNT_TYPE.TENANT
      ? "/tenant-portal"
      : DEFAULT_AUTH_REDIRECT;

  useEffect(() => {
    if (shouldBounce) navigate(authedRedirect, { replace: true });
  }, [authedRedirect, shouldBounce, navigate]);


  if (shouldBounce) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Logo size="large" imageClassName="scale-125" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back Home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-stretch">{children ?? <Outlet />}</main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 sm:px-6 lg:px-8">
          {TRUST.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/45"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
