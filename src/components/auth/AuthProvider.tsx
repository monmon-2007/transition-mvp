"use client";
import React, { createContext, useContext } from "react";
import { SessionProvider, signIn as nextSignIn, signOut as nextSignOut, useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AuthContextType = {
  signingIn: boolean;
  signIn: (data?: Record<string, any>) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Wrap with NextAuth's SessionProvider at the client boundary.
  // The SessionProvider will manage session state; we expose a small wrapper context
  // so existing code can call `useAuth().signIn()` / `signOut()`.
  return (
    <SessionProvider>{children}</SessionProvider>
  );
}

export function useAuth() {
  const { data: session, status } = useSession();
  const signingIn = status === "loading";

  const signIn = async (data?: Record<string, any>) => {
    // data may include { email, password, callbackUrl }
    await nextSignIn("credentials", { redirect: false, ...data });
  };

  const signOut = () => {
    nextSignOut({ callbackUrl: "/login" });
  };

  const ctx = { signingIn, signIn, signOut, isAuthenticated: status === "authenticated", status } as AuthContextType;
  return ctx;
}

const PUBLIC_PATHS = ["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms", "/verify-email", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Client-side gate: blocks protected content from rendering until session is confirmed
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const publicPath = pathname ? isPublicPath(pathname) : true;

  React.useEffect(() => {
    if (!pathname || publicPath) return;
    if (status === "unauthenticated") {
      const next = pathname + (search?.toString() ? `?${search.toString()}` : "");
      router.push(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, pathname, router, search, publicPath]);

  // For protected routes: render nothing while session is loading or user is not authenticated
  // This prevents the flash of protected content before redirect
  if (!publicPath && status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
