'use client';

import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';

type Props = {
  feature: string;
  requiredPlan?: 'pro' | 'pro_plus';
};

/** Full-width upgrade prompt — use for blocking an entire section */
export default function UpgradePrompt({ feature, requiredPlan = 'pro' }: Props) {
  const planLabel = requiredPlan === 'pro_plus' ? 'Pro+' : 'Pro';
  const price = requiredPlan === 'pro_plus' ? '$29' : '$12';

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-4">
        <Lock className="w-5 h-5 text-violet-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        Upgrade to {planLabel} to unlock {feature}
      </h3>
      <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
        {requiredPlan === 'pro'
          ? 'Get AI-powered resume tailoring, cover letters, and job match suggestions to land interviews faster.'
          : 'Get full coaching with severance analysis, negotiation emails, and salary benchmarking.'}
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to {planLabel} — {price}/mo
      </Link>
    </div>
  );
}

/** Small inline badge — use next to buttons or section headers */
export function ProBadge({ plan = 'pro' }: { plan?: 'pro' | 'pro_plus' }) {
  const label = plan === 'pro_plus' ? 'Pro+' : 'Pro';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full leading-none">
      <Sparkles className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

/** Compact inline upgrade prompt — use when a user clicks a gated button */
export function InlineUpgradePrompt({ feature, requiredPlan = 'pro' }: Props) {
  const planLabel = requiredPlan === 'pro_plus' ? 'Pro+' : 'Pro';
  return (
    <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
      <Lock className="w-4 h-4 text-violet-500 shrink-0" />
      <p className="text-xs text-violet-800 flex-1">
        <strong>{feature}</strong> is a {planLabel} feature.
      </p>
      <Link
        href="/pricing"
        className="shrink-0 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
