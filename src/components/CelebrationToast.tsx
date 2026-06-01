"use client";

import React, { useEffect, useState } from "react";
import type { Celebration } from "@/lib/celebrations";

export default function CelebrationToast({
  celebration,
  onDismiss,
}: {
  celebration: Celebration;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // wait for exit animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <div
        className={`pointer-events-auto bg-white border border-gray-200 shadow-xl rounded-2xl px-5 py-4 max-w-sm transition-all duration-300 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{celebration.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">{celebration.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{celebration.description}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="text-gray-300 hover:text-gray-500 text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
