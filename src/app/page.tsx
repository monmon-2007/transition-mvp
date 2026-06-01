'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';

export default function Home() {
  const { status } = useSession();
  const ctaHref = status === 'authenticated' ? '/onboarding' : '/login?mode=register';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NovaPivots",
    "url": "https://www.novapivots.com",
    "description": "NovaPivots is a career transition tool that generates a personalized action plan for people who have been laid off or are changing careers. It covers severance review, benefits transition, financial runway, job search tracking, and AI-powered resume tailoring.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free during beta"
    },
    "audience": {
      "@type": "Audience",
      "audienceType": "People navigating layoffs, career transitions, or job searches"
    },
    "featureList": [
      "Personalized layoff action plan",
      "Severance and legal review checklist",
      "Benefits and COBRA transition guide",
      "Financial runway calculator",
      "AI-powered resume tailoring",
      "Job application tracker",
      "Prioritized task list"
    ],
    "creator": {
      "@type": "Organization",
      "name": "NovaPivots",
      "url": "https://www.novapivots.com"
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Closed Beta Banner */}
      <div className="relative z-20 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-center py-2.5 px-4 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Free beta — limited to the first 100 members
          <Link href={ctaHref} className="underline underline-offset-2 font-semibold hover:text-white/80 transition-colors">
            Get early access →
          </Link>
        </span>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
          <div className="absolute top-40 right-10 w-[400px] h-[400px] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Social proof chip */}
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-8">
            <div className="flex -space-x-2">
              {['bg-violet-400', 'bg-indigo-400', 'bg-purple-400'].map((bg, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${bg} border-2 border-white`} />
              ))}
            </div>
            <span className="text-sm font-medium text-violet-700">72 people joined this week</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tight">
            Stop spiraling.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">Start moving.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed">
            Whether you were laid off yesterday or you&apos;re quietly planning your next move —
            get a structured plan that covers <strong className="text-gray-800">money, deadlines, resumes, and next steps</strong> in under 5 minutes.
          </p>

          <p className="text-sm text-gray-400 mb-10 max-w-xl mx-auto">
            Not generic career advice. A plan built around <em>your</em> severance, <em>your</em> runway, <em>your</em> timeline.
          </p>

          {/* CTA */}
          <Link
            href={ctaHref}
            onClick={() => posthog.capture('cta_clicked', { location: 'hero' })}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-10 sm:px-14 py-4 sm:py-5 rounded-2xl text-lg sm:text-xl font-bold shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.03] transition-all duration-300"
          >
            Build my plan — free
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              No credit card
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              3-minute setup
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Free during beta
            </span>
          </p>
        </div>
      </section>

      {/* ─── PAIN POINTS ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-semibold text-violet-400 uppercase tracking-wider mb-4">Sound familiar?</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "I got laid off and don't know what to do first",
              "I'm not sure if my severance offer is fair",
              "I have no idea how long my savings will last",
              "I'm applying everywhere but getting nowhere",
              "I need to tailor my resume but it takes hours",
              "I'm overwhelmed and can't focus on what matters",
            ].map((pain) => (
              <div key={pain} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <span className="text-red-400 mt-0.5 text-lg shrink-0">&ldquo;</span>
                <p className="text-white/80 text-sm leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-white/60 text-sm">
            NovaPivots replaces the chaos with a clear, step-by-step plan.
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              Your plan in 3 minutes
            </h2>
            <p className="text-lg text-gray-500">Not 3 hours. Not 3 days. Three minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Tell us your situation',
                description: 'Answer a few questions about your employment, severance, finances, and goals. Upload docs if you have them — our AI reads them for you.',
                gradient: 'from-violet-500 to-purple-500',
              },
              {
                step: '2',
                title: 'Get your personalized plan',
                description: 'We generate a prioritized action plan — deadlines first, then finances, then job search. Every task is specific to your situation.',
                gradient: 'from-purple-500 to-indigo-500',
              },
              {
                step: '3',
                title: 'Execute with confidence',
                description: 'Track applications, tailor resumes with AI, monitor your runway, and check off tasks as you go. Update anytime.',
                gradient: 'from-indigo-500 to-blue-500',
              }
            ].map(({ step, title, description, gradient }) => (
              <div key={step} className="group relative">
                <div className="bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold mb-5 shadow-lg`}>
                    {step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              One tool for the entire transition
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Stop juggling spreadsheets, notes apps, and browser tabs. Everything lives here.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '⚖️', title: 'Severance Review', desc: 'Know what to negotiate, what to sign, and what deadlines matter. AI reads your docs and flags what most people miss.', tag: 'AI-powered' },
              { icon: '💰', title: 'Financial Runway', desc: 'See exactly how many months your savings last. Add unemployment benefits, cut subscriptions, and watch the runway extend.', tag: null },
              { icon: '📄', title: 'AI Resume Studio', desc: 'Build, tailor, and download resumes. Paste a job description and get a matched version in seconds — not hours.', tag: 'AI-powered' },
              { icon: '📊', title: 'Application Tracker', desc: 'Kanban board for your job search. Track every application from saved to offer. Never lose track of a follow-up.', tag: null },
              { icon: '🎯', title: 'Smart Task List', desc: 'Prioritized by urgency — visa deadlines surface before LinkedIn updates. Tasks adapt based on your timeline phase.', tag: null },
              { icon: '🧠', title: 'Career Coach', desc: 'AI-generated coaching insights based on your actual progress. Salary benchmarks, interview prep, and pivot recommendations.', tag: 'AI-powered' },
            ].map(({ icon, title, desc, tag }) => (
              <div key={title} className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{icon}</span>
                  {tag && (
                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{tag}</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDER STORY ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-6">Why this exists</p>

              <blockquote className="text-white text-xl sm:text-2xl leading-relaxed mb-6 font-light">
                &ldquo;I was laid off as a Senior Software Engineer. The first week was a blur — severance docs I didn&apos;t understand, COBRA deadlines I almost missed, and a LinkedIn feed full of &lsquo;stay positive!&rsquo; advice that didn&apos;t help.
              </blockquote>

              <p className="text-white/90 text-lg leading-relaxed mb-6">
                <strong className="text-white">What actually helped was structure.</strong> A list of what to do first, what could wait, and what I was about to miss. I built NovaPivots so nobody has to figure that out alone.&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">M</div>
                <div>
                  <p className="text-white font-semibold text-sm">Mina</p>
                  <p className="text-white/60 text-xs">Founder, NovaPivots</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SCREENSHOTS ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">See it in action</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Your dashboard, your pace
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { src: '/screenshots/dashboard.png', label: 'AI Resume Builder & Job Tailoring' },
              { src: '/screenshots/runway.png', label: 'Financial Runway Calculator' },
              { src: '/screenshots/task.png', label: 'Smart Task Tracker' },
            ].map(({ src, label }) => (
              <div key={src} className="group rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:shadow-violet-100 transition-all duration-200">
                <div className="h-52 sm:h-60 overflow-hidden">
                  <img src={src} alt={label} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IT'S FOR ─── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">Built for</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-10">
            Anyone navigating a career change
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '💼', label: 'Recently laid off', desc: 'Get organized from day one' },
              { icon: '🔄', label: 'Career switchers', desc: 'Plan your pivot strategically' },
              { icon: '🔍', label: 'Active job seekers', desc: 'Track and optimize your search' },
              { icon: '🎓', label: 'New graduates', desc: 'Start your career with structure' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all">
                <span className="text-3xl mb-3 block">{icon}</span>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{label}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="px-4 sm:px-6 py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50 pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
            The hardest part is
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">knowing where to start</span>
          </h2>
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
            We&apos;ll figure that out for you. Free, private, and built around your actual situation.
          </p>

          <Link
            href={ctaHref}
            onClick={() => posthog.capture('cta_clicked', { location: 'bottom' })}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-10 sm:px-14 py-5 sm:py-6 rounded-2xl text-xl sm:text-2xl font-bold shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.03] transition-all duration-300"
          >
            Start my plan — it&apos;s free
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <p className="text-sm text-gray-400 mt-6">
            Free forever during beta · No credit card · Your data stays private
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© 2025 NovaPivots. A tool to help you navigate what comes next.</p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="hover:text-gray-600 transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
