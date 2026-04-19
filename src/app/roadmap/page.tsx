"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Roadmap() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main dashboard
    router.replace("/onboarding/layoff/tasks");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
