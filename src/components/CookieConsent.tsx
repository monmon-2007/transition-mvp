"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "novapivots:cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
    // Disable PostHog if user declines
    try {
      const posthog = (window as any).posthog;
      if (posthog?.opt_out_capturing) posthog.opt_out_capturing();
    } catch {}
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-6"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600">
          We use cookies for analytics to improve your experience.
          See our{" "}
          <a href="/privacy" className="text-violet-600 hover:underline font-medium">
            Privacy Policy
          </a>.
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 px-4 py-1.5 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
