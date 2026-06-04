"use client";

import React, { useState, useEffect, useCallback } from "react";

const SCREENS = [
  { id: "scan", label: "Upload & Analyze", hook: "AI reads your severance docs and flags what matters" },
  { id: "alerts", label: "Deadline Alerts", hook: "Surfaces things you'd miss that cost real money" },
  { id: "runway", label: "Financial Runway", hook: "See exactly how long your money lasts" },
  { id: "resume", label: "AI Resume Match", hook: "Tailored to any job description in seconds" },
  { id: "tracker", label: "Application Tracker", hook: "Every opportunity tracked from saved to offer" },
  { id: "plan", label: "Your Action Plan", hook: "Prioritized tasks that adapt to your timeline" },
];

const INTERVAL = 5500;

/* ────────────────────────────────────────── */
/*  Screen 1 — AI Document Scan              */
/* ────────────────────────────────────────── */
function ScanScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      {/* Extracted fields — staggered reveal */}
      <div className="w-full max-w-md space-y-3">
        {[
          { delay: 0, icon: "💰", label: "Severance", value: "$24,000 (12 weeks)", note: "Below market for your tenure", noteColor: "text-amber-600" },
          { delay: 400, icon: "🏥", label: "Health coverage ends", value: "July 15, 2026", note: "COBRA election due in 3 days", noteColor: "text-red-600" },
          { delay: 800, icon: "⚖️", label: "Non-compete", value: "6 months — California", note: "Likely unenforceable in CA", noteColor: "text-emerald-600" },
          { delay: 1200, icon: "✍️", label: "Signing deadline", value: "7 days remaining", note: "Don't sign before reviewing", noteColor: "text-amber-600" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-4 bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm opacity-0"
            style={{ animation: `demo-fade-in 0.5s ease-out ${item.delay}ms forwards` }}
          >
            <span className="text-xl mt-0.5">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.value}</p>
              </div>
              <p className={`text-xs font-medium mt-0.5 ${item.noteColor}`}>{item.note}</p>
            </div>
          </div>
        ))}

        {/* AI insight bar */}
        <div
          className="mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl px-5 py-4 text-white opacity-0"
          style={{ animation: "demo-fade-in 0.5s ease-out 1800ms forwards" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span className="text-xs font-bold uppercase tracking-wider">AI Insight</span>
          </div>
          <p className="text-sm leading-relaxed opacity-90">
            Your package is negotiable. Companies at this level typically offer 16–20 weeks.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Screen 2 — Financial Runway              */
/* ────────────────────────────────────────── */
function RunwayScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      <div className="w-full max-w-md">
        {/* Big number */}
        <div className="text-center mb-6">
          <p
            className="text-6xl sm:text-7xl font-black text-gray-900 opacity-0"
            style={{ animation: "demo-fade-in 0.6s ease-out 0ms forwards" }}
          >
            8.4
          </p>
          <p
            className="text-lg text-gray-500 font-medium -mt-1 opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 300ms forwards" }}
          >
            months of runway
          </p>
          <p
            className="text-sm text-emerald-600 font-semibold mt-1 opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 500ms forwards" }}
          >
            +2.2 months if you file for unemployment
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
              style={{ animation: "demo-bar-fill 1.2s ease-out 600ms forwards", width: "0%" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
            <span>0</span><span>6 mo</span><span>12 mo</span><span>18+</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { delay: 800, emoji: "💰", label: "Severance", value: "$24,000" },
            { delay: 950, emoji: "🏦", label: "Savings", value: "$12,500" },
            { delay: 1100, emoji: "📉", label: "Monthly burn", value: "$5,200/mo" },
            { delay: 1250, emoji: "📋", label: "Unemployment", value: "+$1,800/mo" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm opacity-0"
              style={{ animation: `demo-fade-in 0.4s ease-out ${item.delay}ms forwards` }}
            >
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>{item.emoji}</span>{item.label}
              </p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Scenario */}
        <div
          className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center justify-between opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 1500ms forwards" }}
        >
          <p className="text-sm text-emerald-800">
            <strong>Cut 20% of expenses?</strong> → 10.5 months
          </p>
          <span className="text-emerald-600 text-lg font-bold">↑</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Screen 3 — AI Resume Tailoring           */
/* ────────────────────────────────────────── */
function ResumeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      <div className="w-full max-w-md">
        {/* Match score — big and central */}
        <div className="text-center mb-6">
          <p
            className="text-6xl sm:text-7xl font-black text-blue-600 opacity-0"
            style={{ animation: "demo-fade-in 0.6s ease-out 0ms forwards" }}
          >
            92%
          </p>
          <p
            className="text-lg text-gray-500 font-medium -mt-1 opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 300ms forwards" }}
          >
            resume match score
          </p>
        </div>

        {/* Score bar */}
        <div className="mb-6">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              style={{ animation: "demo-bar-fill-92 1s ease-out 500ms forwards", width: "0%" }}
            />
          </div>
        </div>

        {/* Before / After side by side */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div
            className="bg-white rounded-xl p-4 border border-gray-200 opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 700ms forwards" }}
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Your Resume</p>
            <div className="space-y-2">
              <div className="h-2 w-3/4 bg-gray-200 rounded" />
              <div className="h-2 w-full bg-gray-100 rounded" />
              <div className="h-2 w-5/6 bg-gray-100 rounded" />
              <div className="h-2 w-2/3 bg-gray-100 rounded" />
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {["React", "Node.js", "SQL"].map((s) => (
                <span key={s} className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-4 border-2 border-blue-300 relative opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 1000ms forwards" }}
          >
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
              AI Tailored
            </div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3">Matched Resume</p>
            <div className="space-y-2">
              <div className="h-2 w-3/4 bg-gray-800 rounded" />
              <div className="h-2 w-full bg-blue-100 rounded" />
              <div className="h-2 w-5/6 bg-blue-100 rounded" />
              <div className="h-2 w-4/5 bg-blue-100 rounded" />
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {["React", "TypeScript", "AWS", "CI/CD"].map((s) => (
                <span key={s} className="text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 1300ms forwards" }}
        >
          <div className="flex-1 bg-blue-600 text-white text-sm font-semibold text-center py-3 rounded-xl">
            Download PDF
          </div>
          <div className="flex-1 bg-white border border-gray-200 text-sm font-semibold text-gray-700 text-center py-3 rounded-xl">
            Cover Letter
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Screen 4 — Deadline Alerts               */
/* ────────────────────────────────────────── */
function AlertsScreen() {
  const alerts = [
    { delay: 0, severity: "critical", color: "bg-red-50 border-red-200", iconBg: "bg-red-100", iconColor: "text-red-500", badge: "bg-red-100 text-red-700", badgeText: "3 days left", title: "COBRA election deadline", desc: "You must elect within 60 days or permanently lose the option. This cannot be undone." },
    { delay: 400, severity: "high", color: "bg-amber-50 border-amber-200", iconBg: "bg-amber-100", iconColor: "text-amber-500", badge: "bg-amber-100 text-amber-700", badgeText: "7 days left", title: "Severance signing deadline", desc: "Review before signing. Your offer may be negotiable — most people don't ask." },
    { delay: 800, severity: "action", color: "bg-blue-50 border-blue-200", iconBg: "bg-blue-100", iconColor: "text-blue-500", badge: "bg-blue-100 text-blue-700", badgeText: "This week", title: "File for unemployment benefits", desc: "Adds ~$1,800/mo to your runway. Most states allow filing immediately." },
    { delay: 1200, severity: "info", color: "bg-gray-50 border-gray-200", iconBg: "bg-gray-100", iconColor: "text-gray-400", badge: "bg-gray-100 text-gray-600", badgeText: "June 20", title: "Return company equipment", desc: "Late returns can delay or void your severance payment." },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      <div className="w-full max-w-md space-y-3">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-1 opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 0ms forwards" }}
        >
          <p className="text-sm font-bold text-gray-900">What needs your attention</p>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full animate-pulse">3 urgent</span>
        </div>

        {alerts.map((alert) => (
          <div
            key={alert.title}
            className={`${alert.color} border rounded-xl px-5 py-4 opacity-0`}
            style={{ animation: `demo-fade-in 0.5s ease-out ${alert.delay}ms forwards` }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${alert.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                {alert.severity === "critical" ? (
                  <svg className={`w-4 h-4 ${alert.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                ) : (
                  <svg className={`w-4 h-4 ${alert.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{alert.title}</span>
                  <span className={`text-[9px] font-bold ${alert.badge} px-2 py-0.5 rounded-full`}>{alert.badgeText}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{alert.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Screen 5 — Application Tracker           */
/* ────────────────────────────────────────── */
function TrackerScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      <div className="w-full max-w-md">
        {/* Funnel — the big visual */}
        <div className="mb-6">
          <div className="space-y-2">
            {[
              { delay: 0, label: "Saved", count: 24, width: "w-full", bg: "bg-gray-200", text: "text-gray-700" },
              { delay: 200, label: "Applied", count: 15, width: "w-[75%]", bg: "bg-blue-200", text: "text-blue-800" },
              { delay: 400, label: "Interviewing", count: 4, width: "w-[40%]", bg: "bg-violet-300", text: "text-violet-800" },
              { delay: 600, label: "Offer", count: 1, width: "w-[20%]", bg: "bg-emerald-300", text: "text-emerald-800" },
            ].map((stage) => (
              <div
                key={stage.label}
                className="opacity-0"
                style={{ animation: `demo-fade-in 0.4s ease-out ${stage.delay}ms forwards` }}
              >
                <div className={`${stage.width} ${stage.bg} rounded-lg px-4 py-2.5 flex items-center justify-between transition-all`}>
                  <span className={`text-sm font-bold ${stage.text}`}>{stage.label}</span>
                  <span className={`text-lg font-black ${stage.text}`}>{stage.count}</span>
                </div>
              </div>
            ))}
          </div>
          <p
            className="text-xs text-gray-400 text-center mt-3 opacity-0"
            style={{ animation: "demo-fade-in 0.4s ease-out 800ms forwards" }}
          >
            27% application-to-interview rate · above average
          </p>
        </div>

        {/* Recent activity */}
        <div className="space-y-2.5">
          {[
            { delay: 900, company: "Stripe", role: "Sr. Frontend Engineer", status: "Interview Thu", statusColor: "text-violet-700 bg-violet-50 border-violet-200", logo: "S" },
            { delay: 1050, company: "Linear", role: "Product Engineer", status: "Offer received!", statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200", logo: "L" },
            { delay: 1200, company: "Vercel", role: "Staff Engineer", status: "Applied 2d ago", statusColor: "text-blue-700 bg-blue-50 border-blue-200", logo: "V" },
          ].map((app) => (
            <div
              key={app.company}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm opacity-0"
              style={{ animation: `demo-fade-in 0.4s ease-out ${app.delay}ms forwards` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                  {app.logo}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{app.company}</p>
                  <p className="text-xs text-gray-400">{app.role}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${app.statusColor}`}>
                {app.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Screen 6 — Smart Action Plan             */
/* ────────────────────────────────────────── */
function PlanScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 sm:px-10 py-8">
      <div className="w-full max-w-md">
        {/* Phase indicator */}
        <div
          className="flex items-center gap-3 mb-5 opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 0ms forwards" }}
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            Week 3 — Prepare
          </span>
          <span className="text-xs text-gray-500">Get your resume ready and start networking</span>
        </div>

        {/* Progress bar */}
        <div
          className="mb-6 opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 200ms forwards" }}
        >
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
              style={{ animation: "demo-bar-fill-25 0.8s ease-out 400ms forwards", width: "0%" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-medium">
            <span className="text-gray-900 font-bold">Stabilize</span>
            <span className="text-violet-600 font-bold">Prepare</span>
            <span>Execute</span>
            <span>Persist</span>
          </div>
        </div>

        {/* Today's focus */}
        <div
          className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl px-5 py-4 mb-4 opacity-0"
          style={{ animation: "demo-fade-in 0.4s ease-out 400ms forwards" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="M12 8v4l3 3"/></svg>
            </div>
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Today&apos;s Focus</span>
          </div>
          <p className="text-sm font-bold text-gray-900">Tailor your resume for 3 target roles</p>
          <p className="text-xs text-gray-500 mt-0.5">AI can match your experience to job descriptions in seconds</p>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {[
            { delay: 600, done: true, text: "File for unemployment benefits", tag: "Financial", tagColor: "text-emerald-700 bg-emerald-50" },
            { delay: 750, done: true, text: "Review severance agreement", tag: "Legal", tagColor: "text-red-700 bg-red-50" },
            { delay: 900, done: false, text: "Update LinkedIn headline & summary", tag: "Networking", tagColor: "text-blue-700 bg-blue-50" },
            { delay: 1050, done: false, text: "Reach out to 5 former colleagues", tag: "Networking", tagColor: "text-blue-700 bg-blue-50" },
            { delay: 1200, done: false, text: "Apply to 3 roles this week", tag: "Job Search", tagColor: "text-violet-700 bg-violet-50" },
          ].map((task) => (
            <div
              key={task.text}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm opacity-0"
              style={{ animation: `demo-fade-in 0.4s ease-out ${task.delay}ms forwards` }}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                task.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
              }`}>
                {task.done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                )}
              </div>
              <p className={`text-sm flex-1 ${task.done ? "text-gray-400 line-through" : "text-gray-900 font-medium"}`}>
                {task.text}
              </p>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${task.tagColor}`}>{task.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SCREEN_COMPONENTS: Record<string, React.FC> = {
  scan: ScanScreen,
  alerts: AlertsScreen,
  runway: RunwayScreen,
  resume: ResumeScreen,
  tracker: TrackerScreen,
  plan: PlanScreen,
};

export default function AnimatedProductDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);

  const goTo = useCallback((next: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setDisplayIndex(next);
      setActiveIndex(next);
      setProgress(0);
      setTransitioning(false);
    }, 300);
  }, []);

  const advance = useCallback(() => {
    const next = (activeIndex + 1) % SCREENS.length;
    goTo(next);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (isPaused || transitioning) return;

    const tick = 50;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (tick / INTERVAL) * 100;
        if (next >= 100) {
          advance();
          return 100;
        }
        return next;
      });
    }, tick);

    return () => clearInterval(interval);
  }, [isPaused, transitioning, advance, activeIndex]);

  const ActiveScreen = SCREEN_COMPONENTS[SCREENS[displayIndex].id];

  return (
    <div
      className="relative max-w-3xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Browser chrome */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl shadow-violet-500/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/80 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 mx-6">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 text-center max-w-sm mx-auto flex items-center justify-center gap-2">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
              novapivots.com
            </div>
          </div>
          <div className="w-16" />
        </div>

        {/* Screen area with crossfade */}
        <div className="relative bg-gradient-to-b from-gray-50 to-white min-h-[460px] sm:min-h-[500px] overflow-hidden">
          <div
            className="transition-opacity duration-300 ease-in-out h-full"
            style={{ opacity: transitioning ? 0 : 1 }}
          >
            <ActiveScreen />
          </div>
        </div>

        {/* Bottom bar — screen selector with hook text */}
        <div className="border-t border-gray-100 bg-white overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {SCREENS.map((screen, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              return (
                <button
                  key={screen.id}
                  onClick={() => { if (i !== activeIndex) goTo(i); }}
                  className={`relative flex-1 min-w-[120px] sm:min-w-0 px-3 sm:px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-gray-50/80" : "hover:bg-gray-50/40"
                  }`}
                >
                  <p className={`text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                    {screen.label}
                  </p>
                  <p className={`hidden sm:block text-[10px] mt-0.5 transition-colors leading-snug ${isActive ? "text-gray-500" : "text-gray-300"}`}>
                    {screen.hook}
                  </p>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                    {isActive && (
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                    {isPast && (
                      <div className="h-full w-full bg-violet-300 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Glow behind */}
      <div className="absolute -inset-8 bg-gradient-to-r from-violet-200/30 via-purple-200/30 to-indigo-200/30 rounded-[2rem] blur-3xl -z-10" />
    </div>
  );
}
