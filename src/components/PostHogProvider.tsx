"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, Suspense } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_PLACEHOLDER_REPLACE_WITH_YOUR_KEY";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY !== "phc_PLACEHOLDER_REPLACE_WITH_YOUR_KEY") {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // We track manually below
    capture_pageleave: true,
  });
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      ph?.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

function IdentityTracker() {
  const { data: session, status } = useSession();
  const ph = usePostHog();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      ph?.identify(session.user.email, {
        email: session.user.email,
        name: session.user.name,
      });
    } else if (status === "unauthenticated") {
      ph?.reset();
    }
  }, [status, session, ph]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
        <IdentityTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
