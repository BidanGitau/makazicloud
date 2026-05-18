"use client";

import { useState, useEffect } from "react";
import Link from "@/app/_components/AppLink";
import { usePathname } from "@/app/_hooks/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/app/_context/AuthContext";
import { ROUTES } from "@/app/_lib/routes";

const linkBase =
  "text-[11px] font-bold uppercase tracking-[0.2em] transition-colors";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { href: "/properties", label: "Properties" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (path) => pathname === path;

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-8 md:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${linkBase} ${
              isActive(link.href)
                ? "border-b border-black pb-0.5 text-black"
                : "text-black/55 hover:text-black"
            }`}
          >
            {link.label}
          </Link>
        ))}

        <div className="ml-2 flex items-center gap-5">
          {user ? (
            <>
              <Link
                href={ROUTES.DASHBOARD}
                className="inline-flex min-h-10 items-center gap-2 bg-blue-700 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className={`${linkBase} text-black/55 hover:text-black`}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`${linkBase} text-black/55 hover:text-black`}
              >
                Sign In
              </Link>
              <Link
                href="/management-signup"
                className="inline-flex min-h-10 items-center gap-2 bg-blue-700 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-[70] p-2 text-black md:hidden"
        aria-label="Toggle mobile menu"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-blue-900/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div
          id="mobile-navigation-menu"
          className="fixed inset-x-4 top-20 z-[60] max-h-[calc(100vh-6rem)] overflow-y-auto border border-blue-700 bg-white p-6 shadow-2xl md:hidden"
        >
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-3 text-[13px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  isActive(link.href)
                    ? "border-l-2 border-blue-700 bg-stone-50 text-black"
                    : "text-black/60 hover:bg-stone-50 hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="space-y-3 border-t border-stone-200 pt-5">
              {user ? (
                <>
                  <Link
                    href={ROUTES.DASHBOARD}
                    onClick={() => setIsOpen(false)}
                    className="block bg-blue-700 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full border border-blue-700 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-black"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block border border-blue-700 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-black"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/management-signup"
                    onClick={() => setIsOpen(false)}
                    className="block bg-blue-700 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
