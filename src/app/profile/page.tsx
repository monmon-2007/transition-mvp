'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Save, Loader2, Check, ArrowLeft, Sparkles, CreditCard, ExternalLink, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { plan, isPro, isProPlus, loading: subLoading, openPortal } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      setName((session.user as any)?.name || '');
      setEmail(session.user?.email || '');
      setIsLoading(false);
    }
  }, [status, router, session]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to update profile');
        return;
      }
      await updateSession({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.message || 'Failed to change password');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch {
      setPasswordError('An unexpected error occurred');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (isLoading || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const userInitial = (session.user as any)?.name?.[0] || (session.user?.email?.[0] || 'U').toUpperCase();
  const userImage = (session.user as any)?.image || null;
  const isOAuthUser = (session.user as any)?.provider === 'google';

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/onboarding/layoff/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-6 mb-6">
            {userImage ? (
              <img src={userImage} alt="" className="w-20 h-20 rounded-full object-cover shadow-md" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-semibold shadow-md">
                {userInitial}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {(session.user as any)?.name || 'User'}
              </h1>
              <p className="text-gray-500 text-sm">{session.user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 rounded-lg text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Saved' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
          {subLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current plan card */}
              <div className={`relative overflow-hidden rounded-xl p-5 border ${
                isProPlus ? 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200' :
                isPro ? 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                {(isPro || isProPlus) && (
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-violet-200/20 -translate-y-16 translate-x-16" />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                      isPro || isProPlus ? 'bg-gradient-to-br from-violet-500 to-indigo-500' : 'bg-gray-200'
                    }`}>
                      {isPro || isProPlus ? (
                        <Sparkles className="w-5 h-5 text-white" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {isProPlus ? 'Pro+' : isPro ? 'Pro' : 'Free'} Plan
                      </p>
                      <p className="text-sm text-gray-500">
                        {isProPlus ? '$29/month' : isPro ? '$12/month' : 'No charge'}
                      </p>
                    </div>
                  </div>
                  {isPro || isProPlus ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Features included */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {isPro || isProPlus ? 'Your features' : "What's included"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Resume builder', included: true },
                    { label: 'Application tracker', included: true },
                    { label: 'Financial runway calculator', included: true },
                    { label: 'Task management', included: true },
                    { label: 'AI resume tailoring', included: isPro || isProPlus, plan: 'Pro' },
                    { label: 'AI cover letters', included: isPro || isProPlus, plan: 'Pro' },
                    { label: 'AI job match suggestions', included: isPro || isProPlus, plan: 'Pro' },
                    { label: 'Severance analysis', included: isProPlus, plan: 'Pro+' },
                    { label: 'Negotiation coaching', included: isProPlus, plan: 'Pro+' },
                    { label: 'Salary benchmarking', included: isProPlus, plan: 'Pro+' },
                  ].map((feature) => (
                    <div key={feature.label} className="flex items-center gap-2 py-1">
                      {feature.included ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                        {feature.label}
                      </span>
                      {!feature.included && feature.plan && (
                        <span className="text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full leading-none">
                          {feature.plan}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                {isPro || isProPlus ? (
                  <button
                    onClick={async () => {
                      setPortalLoading(true);
                      await openPortal();
                      setPortalLoading(false);
                    }}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Manage billing
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 rounded-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade to Pro — 7 days free
                  </Link>
                )}
                {isPro && !isProPlus && (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 border border-violet-200 px-4 py-2 rounded-lg hover:bg-violet-50 transition-colors"
                  >
                    Upgrade to Pro+
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Change Password — only for email/password users */}
        {!isOAuthUser && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              {passwordError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{passwordError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : passwordSaved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {passwordSaved ? 'Password changed' : 'Change password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
