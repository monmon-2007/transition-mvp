'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '@/lib/stripe';

type SubscriptionData = {
  plan: SubscriptionTier;
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    plan: 'free',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription({
          plan: data.plan || 'free',
          status: data.status || 'active',
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
        });
      }
    } catch {
      // Default to free on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPro = subscription.plan === 'pro' || subscription.plan === 'pro_plus';
  const isProPlus = subscription.plan === 'pro_plus';
  const isActive = subscription.status === 'active';

  function canUseFeature(feature: string): boolean {
    if (!isActive) return false;
    switch (feature) {
      case 'ai_resume_tailoring':
      case 'ai_cover_letter':
      case 'ai_job_match':
        return isPro;
      case 'ai_severance_analysis':
      case 'offer_negotiation':
      case 'salary_benchmark':
        return isProPlus;
      case 'unlimited_applications':
      case 'unlimited_resumes':
        return isPro;
      default:
        return true; // Free features
    }
  }

  async function openPortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return {
    ...subscription,
    loading,
    isPro,
    isProPlus,
    isActive,
    canUseFeature,
    openPortal,
    refresh,
  };
}
