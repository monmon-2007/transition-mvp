import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default LoadingState;
