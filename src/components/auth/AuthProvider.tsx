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

// Client-side gate: redirect unauthenticated users to /login (preserves next)
export function AuthGate({ children, publicPaths = ["/login", "/register", "/", "/about"] }: { children: React.ReactNode; publicPaths?: string[] }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    if (status === "unauthenticated") {
      const next = pathname + (search ? `?${search.toString()}` : "");
      router.push(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, pathname, router, search, publicPaths]);

  return <>{children}</>;
}
