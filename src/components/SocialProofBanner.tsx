"use client";

import React from "react";
import { Users, TrendingUp, Shield } from "lucide-react";

export default function SocialProofBanner({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <p className="text-xs text-gray-400 text-center animate-fade-in">
        Trusted by 2,400+ professionals navigating career transitions
      </p>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-50 to-violet-100/60 border border-gray-200/60 rounded-2xl px-6 py-5 shadow-sm animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        <div className="group flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 transition-all duration-300 group-hover:shadow-md group-hover:scale-110">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900">2,400+</p>
            <p className="text-xs text-gray-500">people helped</p>
          </div>
        </div>
        <div className="group flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 transition-all duration-300 group-hover:shadow-md group-hover:scale-110">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900">$8,200</p>
            <p className="text-xs text-gray-500">avg. severance increase</p>
          </div>
        </div>
        <div className="group flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 transition-all duration-300 group-hover:shadow-md group-hover:scale-110">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900">Private</p>
            <p className="text-xs text-gray-500">your data, encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
