import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#logo-gradient)" />
      {/* Pivot arrow: vertical stem going up, then turning right */}
      {/* Vertical line */}
      <line x1="14" y1="28" x2="14" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Horizontal line */}
      <line x1="14" y1="14" x2="27" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Arrowhead pointing right */}
      <polyline points="23,10 27,14 23,18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Small dot at base to indicate starting point */}
      <circle cx="14" cy="28" r="2" fill="white" />
    </svg>
  );
}
