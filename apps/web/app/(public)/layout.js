"use client";

import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import Logo from "@/app/_components/Logo";
import Navigation from "@/app/_components/Navigation";

export default function PublicLayout({ children }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          isScrolled
            ? "border-b border-stone-200 bg-white"
            : "border-b border-transparent bg-white"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 sm:py-5">
            <Logo
              size={isHomePage ? "large" : "default"}
              imageClassName={isHomePage ? "scale-125" : ""}
            />
            <Navigation />
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <p
                className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Makazi<span className="text-black/40">cloud</span>
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
                Property Operating System
              </p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-black/55">
                Rent collection, tenant management, maintenance, and financial
                reporting in one platform — built for Kenya.
              </p>
              <div className="mt-6 flex items-center gap-4">
                {[
                  { label: "FB", href: "#" },
                  { label: "TW", href: "#" },
                  { label: "IG", href: "#" },
                  { label: "LI", href: "#" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 hover:text-black"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
                Platform
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  { href: "/properties", label: "Properties" },
                  { href: "/login", label: "Management" },
                  { href: "/about", label: "About" },
                  { href: "/contact", label: "Contact" },
                ].map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-[13px] font-medium text-black/70 transition-colors hover:text-black"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
                Support
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  { href: "/help", label: "Help Center" },
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/support", label: "Get Support" },
                ].map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-[13px] font-medium text-black/70 transition-colors hover:text-black"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              © {new Date().getFullYear()} Makazicloud — Built in Nairobi
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              Made in Kenya · M-Pesa Ready
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
