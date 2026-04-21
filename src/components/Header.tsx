"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "./Logo";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    await signOut({ redirect: false });
    router.push("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router]);

  const userInitial = (session?.user as any)?.name?.[0] || (session?.user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 py-3 flex items-center justify-between w-full max-w-7xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo size={32} />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
            NovaPivots
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white bg-blue-500 px-1.5 py-0.5 rounded-full leading-none">
            Beta
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {status === "loading" ? (
            <span className="text-sm text-slate-500">Loading...</span>
          ) : session?.user ? (
            <>
              <Link
                href="/onboarding/layoff/tasks"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold shadow-sm text-sm">
                    {userInitial}
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[100]">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{(session.user as any)?.name || "User"}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                    </div>
                    <div className="py-2">
                      <Link href="/onboarding/layoff/tasks" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Dashboard</Link>
                      <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Profile</Link>
                      <Link href="/contact" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Contact & Feedback</Link>
                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-2 pt-2">Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Sign in</Link>
              <Link href="/login?mode=register" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                Get started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile right side */}
        <div className="flex sm:hidden items-center gap-2">
          {session?.user && (
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {userInitial}
            </div>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white">
          {status !== "loading" && (
            session?.user ? (
              <div className="px-4 py-3 space-y-1">
                <div className="pb-3 mb-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{(session.user as any)?.name || "User"}</p>
                  <p className="text-xs text-gray-500">{session.user?.email}</p>
                </div>
                <Link href="/onboarding/layoff/tasks" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Dashboard</Link>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Profile</Link>
                <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Contact & Feedback</Link>
                <button onClick={handleSignOut} className="block w-full text-left py-2.5 text-sm font-medium text-red-600 border-t border-gray-100 mt-2 pt-4">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2">
                <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Contact</Link>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Sign in</Link>
                <Link
                  href="/login?mode=register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium"
                >
                  Get started free
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </header>
  );
}
