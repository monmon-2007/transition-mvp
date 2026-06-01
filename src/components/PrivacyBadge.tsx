"use client";

import React from "react";
import { Shield } from "lucide-react";

export default function PrivacyBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
      <Shield className="w-3.5 h-3.5" />
      <span>Your documents are encrypted and never shared with third parties.</span>
    </div>
  );
}
