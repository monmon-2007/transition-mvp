'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Check, X, Loader2 } from 'lucide-react';
import { analytics } from '@/lib/analytics';

const TIERS = [
  {
    name: 'Free',
    price: 0,
    description: 'Get organized and start your plan',
    cta: 'Get started',
    plan: 'free' as const,
    highlighted: false,
    features: [
      { name: 'Personalized action plan', included: true },
      { name: 'Financial runway calculator', included: true },
      { name: 'Up to 10 job applications', included: true },
      { name: '1 resume upload', included: true },
      { name: 'Task tracker', included: true },
      { name: 'Network contacts tracker', included: true },
      { name: 'Dark mode', included: true },
      { name: 'AI resume tailoring', included: false },
      { name: 'AI cover letter generation', included: false },
      { name: 'AI job match suggestions', included: false },
      { name: 'AI severance analysis', included: false },
      { name: 'Offer negotiation coaching', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 12,
    description: 'AI-powered tools to land interviews faster',
    cta: 'Start 7-day free trial',
    plan: 'pro' as const,
    highlighted: true,
    trial: true,
    features: [
      { name: 'Personalized action plan', included: true },
      { name: 'Financial runway calculator', included: true },
      { name: 'Unlimited job applications', included: true },
      { name: 'Unlimited resumes', included: true },
      { name: 'Task tracker', included: true },
      { name: 'Network contacts tracker', included: true },
      { name: 'Dark mode', included: true },
      { name: 'AI resume tailoring', included: true },
      { name: 'AI cover letter generation', included: true },
      { name: 'AI job match suggestions', included: true },
      { name: 'AI severance analysis', included: false },
      { name: 'Offer negotiation coaching', included: false },
    ],
  },
  {
    name: 'Pro+',
    price: 29,
    description: 'Full coaching suite for high-stakes transitions',
    cta: 'Get Pro+',
    plan: 'pro_plus' as const,
    highlighted: false,
    features: [
      { name: 'Personalized action plan', included: true },
      { name: 'Financial runway calculator', included: true },
      { name: 'Unlimited job applications', included: true },
      { name: 'Unlimited resumes', included: true },
      { name: 'Task tracker', included: true },
      { name: 'Network contacts tracker', included: true },
      { name: 'Dark mode', included: true },
      { name: 'AI resume tailoring', included: true },
      { name: 'AI cover letter generation', included: true },
      { name: 'AI job match suggestions', included: true },
      { name: 'AI severance analysis', included: true },
      { name: 'Offer negotiation coaching', included: true },
    ],
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('subscription') === 'cancelled';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    analytics.pricingPageViewed();
  }, []);

  async function handleSubscribe(plan: 'pro' | 'pro_plus') {
    if (!session?.user) {
      window.location.href = `/login?mode=register&redirect=/pricing`;
      return;
    }

    setLoadingPlan(plan);
    posthog.capture('checkout_started', { plan });

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        setLoadingPlan(null);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          {cancelled && (
            <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
              Checkout was cancelled. You can try again anytime.
            </div>
          )}

          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              Simple plans, no surprises
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Start free. Upgrade when you need AI-powered tools to accelerate your career transition.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-7 ${
                  tier.highlighted
                    ? 'border-2 border-violet-500 shadow-xl shadow-violet-100 relative'
                    : 'border border-gray-200 hover:shadow-lg transition-shadow'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <h2 className="text-lg font-bold text-gray-900 mb-1">{tier.name}</h2>
                <p className="text-sm text-gray-500 mb-5">{tier.description}</p>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black text-gray-900">${tier.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>

                {tier.trial && (
                  <p className="text-xs text-violet-600 font-medium mb-4">7-day free trial included</p>
                )}
                {!tier.trial && <div className="mb-4" />}

                {tier.plan === 'free' ? (
                  <Link
                    href={status === 'authenticated' ? '/onboarding/layoff/dashboard' : '/login?mode=register'}
                    className="block w-full text-center py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 transition-colors mb-6"
                  >
                    {status === 'authenticated' ? 'Go to dashboard' : tier.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier.plan)}
                    disabled={loadingPlan !== null}
                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all mb-6 disabled:opacity-50 ${
                      tier.highlighted
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
                        : 'border-2 border-violet-500 text-violet-700 hover:bg-violet-50'
                    }`}
                  >
                    {loadingPlan === tier.plan ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirecting...
                      </span>
                    ) : (
                      tier.cta
                    )}
                  </button>
                )}

                <ul className="space-y-3 text-sm">
                  {tier.features.map((f) => (
                    <li key={f.name} className="flex items-start gap-2">
                      {f.included ? (
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <span className={f.included ? 'text-gray-600' : 'text-gray-400'}>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes. Cancel from your account at any time. You keep access until the end of your billing period.',
                },
                {
                  q: 'What happens after my free trial?',
                  a: 'After 7 days you\'ll be charged $12/month for Pro. Cancel before the trial ends and you won\'t be charged.',
                },
                {
                  q: 'Can I switch plans?',
                  a: 'Yes. Upgrade or downgrade anytime from your dashboard. Changes take effect immediately, with prorated billing.',
                },
                {
                  q: 'Is my data safe?',
                  a: 'Your data is encrypted at rest and in transit. We never sell your information. You can delete your account and data at any time.',
                },
                {
                  q: 'What AI features are included?',
                  a: 'Pro includes AI resume tailoring, cover letter generation, and job match suggestions. Pro+ adds severance document analysis and offer negotiation coaching with AI-generated emails.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{q}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
