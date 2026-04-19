'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 pt-20 pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Main headline */}
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
                From laid off to
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-transparent bg-clip-text"> focused</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl sm:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
                A personalized action plan based on your specific situation — severance, benefits, finances, and job search — all in one place.
              </p>
              <p className="text-base text-gray-400 mb-12 max-w-2xl mx-auto">
                No generic advice. No guarantees. Just a structured plan built around your circumstances.
              </p>

              {/* CTA */}
              <button
                onClick={() => router.push('/onboarding')}
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-12 py-5 rounded-2xl text-xl font-bold shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300"
              >
                Build your plan — free
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>

              <p className="text-sm text-gray-500 mt-4">No credit card · Takes 3 minutes</p>

              {/* Audience tags */}
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                {[
                  { icon: '💼', label: 'Recently laid off' },
                  { icon: '🔄', label: 'Career switchers' },
                  { icon: '🎓', label: 'Fresh graduates' },
                  { icon: '🚀', label: 'Seeking internships' }
                ].map(({ icon, label }) => (
                  <div key={label} className="bg-white/60 backdrop-blur-sm border border-violet-100 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium text-gray-700">
                      {icon} {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Founder Story Section */}
        <section className="px-6 py-20 bg-gradient-to-br from-violet-600 to-indigo-600">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                  👤
                </div>
                <div>
                  <div className="text-white/90 text-sm font-medium mb-1">Why I built this</div>
                  <div className="text-white text-lg font-semibold">From layoff to clarity</div>
                </div>
              </div>

              <blockquote className="text-white text-xl sm:text-2xl leading-relaxed mb-6 font-light">
                "I was laid off as a Senior Software Engineer. Lost, anxious, and unsure where to start.
                <span className="font-semibold"> What helped most wasn't motivation — it was having a clear, structured plan for what to do first.</span>"
              </blockquote>

              <p className="text-white/90 text-lg leading-relaxed">
                I built this to give others that same structure from day one — a plan that accounts for your specific severance, benefits, finances, and timeline, not just generic job search tips.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-6 py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Your plan in 3 steps
              </h2>
              <p className="text-xl text-gray-600">
                Built around your situation, not a generic template.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Tell us your situation',
                  description: 'Share your employment status, severance details, benefits, and finances. Takes about 3 minutes.',
                  icon: '📝'
                },
                {
                  step: '02',
                  title: 'Get your personalized plan',
                  description: 'We generate a prioritized action plan based on your specific circumstances — deadlines, finances, and goals.',
                  icon: '🗺️'
                },
                {
                  step: '03',
                  title: 'Work through it step by step',
                  description: 'Track tasks, manage applications, and stay organized. Update your plan anytime as things change.',
                  icon: '✅'
                }
              ].map(({ step, title, description, icon }) => (
                <div key={step} className="relative">
                  <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 h-full">
                    <div className="text-6xl mb-6">{icon}</div>
                    <div className="text-sm font-bold text-violet-600 mb-3">STEP {step}</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
                    <p className="text-gray-600 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What it covers */}
        <section className="px-6 py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-900 mb-4">
                What your plan covers
              </h2>
              <p className="text-lg text-gray-600">
                Everything that matters after a layoff, organized in one place.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: '📋', title: 'Severance & legal review', desc: 'Deadlines, release of claims, and what to check before signing' },
                { icon: '🏥', title: 'Benefits & health coverage', desc: 'COBRA, HSA/FSA, and coverage transition planning' },
                { icon: '💰', title: 'Financial runway', desc: 'Estimate how long your savings last based on your actual expenses' },
                { icon: '🎯', title: 'Job search tracking', desc: 'Applications, contacts, and resume versions in one place' },
                { icon: '📄', title: 'Resume tools', desc: 'Build or tailor your resume with AI assistance' },
                { icon: '📅', title: 'Prioritized task list', desc: 'Time-sensitive actions sorted by what matters most right now' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="text-2xl mb-3">{icon}</div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">
              Results vary based on your situation. This tool provides structure and guidance, not guarantees.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6">
              Ready to get organized?
            </h2>
            <p className="text-2xl text-gray-600 mb-12">
              Build a plan around your actual situation — free, in about 3 minutes.
            </p>

            <button
              onClick={() => router.push('/onboarding')}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-12 py-6 rounded-2xl text-2xl font-bold shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300"
            >
              Start your plan
              <svg className="w-7 h-7 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            <p className="text-gray-500 mt-6">
              Free · No credit card · 3-minute setup
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 border-t border-gray-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© 2025 NovaPivots. A tool to help you navigate what comes next.</p>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="hover:text-gray-700 transition-colors">Contact</Link>
              <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
