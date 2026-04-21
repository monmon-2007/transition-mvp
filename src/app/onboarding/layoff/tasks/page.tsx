"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake, LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import { fetchTasks, saveTasks } from "@/lib/api/tasks";
import { saveMonthlyExpenses } from "@/lib/api/layoffIntake";
import { computeRunway, formatCurrency, type RunwayResult } from "@/lib/runway";
import { computeJobSearchInsights, getApplicationWarnings, getNextBestAction, getRoleCategory, type Insight, type NextBestAction } from "@/lib/jobSearchInsights";
import {
  ChevronDown, ChevronUp, Plus, CheckCircle2, Circle,
  Clock, AlertTriangle, ArrowRight, StickyNote, Loader2,
  TrendingUp, TrendingDown, Minus, Wand2,
} from "lucide-react";
import {
  fetchResumes, createResume as apiCreateResume,
  type ResumeApiResponse,
} from "@/lib/api/resumes";
import {
  fetchApplications, createApplication as apiCreateApplication,
  updateApplication as apiUpdateApplication,
  type ApplicationApiResponse,
} from "@/lib/api/applications";
import {
  fetchContacts, createContact as apiCreateContact,
  type ContactApiResponse,
} from "@/lib/api/contacts";

import type { IntakeContext } from "../../resume/page";
const ResumeBuilder = dynamic(() => import("../../resume/page"), { ssr: false }) as React.ComponentType<{ intakeContext?: IntakeContext }>;

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type Status = "Not started" | "In progress" | "Done" | "Skipped";

type TaskNote = {
  id: string;
  text: string;
  timestamp: string;
};

type Task = {
  id: string;
  title: string;
  explanation: string;
  why: string;
  status: Status;
  learnMore?: string;
  deadline?: string;
  optional?: boolean;
  category?: string;
  priority?: "high" | "medium" | "low";
  estimatedTime?: string;
  dependencies?: string[];
  notes?: TaskNote[];
};

type ResumeVersion = {
  id: string;
  name: string;
  targetRole: string;
  seniorityLevel?: string;
  lastEdited: string;
  status: "draft" | "ready" | "sent";
  notes?: string;
  sourceText?: string;
};

type JobApplication = {
  id: string;
  company: string;
  role: string;
  jobLink?: string;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
  dateApplied?: string;
  lastUpdate: string;
  resumeVersion?: string;
  resumeId?: number;
  tailored?: boolean;
  notes?: string;
  interviewDate?: string;
};

type NetworkContact = {
  id: string;
  name: string;
  company: string;
  relationship: string;
  lastContact: string;
  nextFollowUp?: string;
  notes?: string;
};

type SeveranceData =
  | { type: "payroll"; endDate: string }
  | { type: "lump_sum"; paidDate: string; terminationDate: string }
  | null;

type AccountPresence = "Yes" | "No" | "Unsure";

type LayoffData = {
  layoffId: string;
  employmentStatus: "unemployed" | "employed";
  severance: SeveranceData;
  accounts: { has401k: AccountPresence; hasHsa: AccountPresence; hasFsa: AccountPresence; hasCommuter: AccountPresence };
  benefitsStatus: { healthPlanActive: boolean; healthEndDate?: string };
  emergencyCashMonths?: number;
  name?: string;
  lastRole?: string;
  lastCompany?: string;
  terminationDate?: string;
};

/* ─────────────────────────────────────────
   Phase config
───────────────────────────────────────── */
type PhaseId = "act-now" | "stabilize" | "career" | "execute" | "ongoing";

const PHASES: { id: PhaseId; label: string; description: string; border: string; badge: string; dot: string }[] = [
  {
    id: "act-now",
    label: "Act Now",
    description: "Time-sensitive — deadlines and immediate decisions",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
  {
    id: "stabilize",
    label: "Stabilize Your Situation",
    description: "Protect your finances, benefits, and legal standing",
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "career",
    label: "Get Focused",
    description: "Define your direction and build your search assets",
    border: "border-l-violet-500",
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    dot: "bg-violet-500",
  },
  {
    id: "execute",
    label: "Start Your Search",
    description: "Apply, network, and prepare for interviews",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "ongoing",
    label: "Ongoing",
    description: "Lower-urgency items to handle when ready",
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
];

/* ─────────────────────────────────────────
   Guided actions per task
───────────────────────────────────────── */
const GUIDED_ACTIONS: Record<string, { label: string; note?: string; href?: string; tab?: string }[]> = {
  "review-severance": [
    { label: "Explore whether you can negotiate", href: "/onboarding/layoff/severance", note: "See if the terms can be improved before you sign — takes 3 minutes" },
    { label: "Read the full agreement before anything else", note: "Look for: release of claims, non-compete scope, confidentiality, payment triggers" },
    { label: "If release of claims is required, consider a lawyer review", note: "A 1-hour employment attorney consultation ($200–400) often more than pays for itself" },
  ],
  "severance-sign-decision": [
    { label: "Explore negotiation options before signing", href: "/onboarding/layoff/severance", note: "A short walkthrough helps you assess your position and draft an email if needed" },
    { label: "Review every clause one more time before signing" },
    { label: "You can request an extension — most companies will grant a few extra days" },
  ],
  "health-insurance-plan": [
    { label: "Compare COBRA vs ACA Marketplace before deciding", note: "ACA is often 40–70% cheaper for comparable coverage" },
    { label: "Check if you qualify for Medicaid", note: "Lower projected income may qualify you for free coverage" },
    { label: "Visit healthcare.gov — losing job-based coverage is a qualifying life event" },
  ],
  "unemployment-filing": [
    { label: "Find your state's unemployment insurance agency", note: "Search '[your state] unemployment insurance'" },
    { label: "Have ready: employer info, separation date, last wages, reason for separation" },
    { label: "File as early as you're eligible — processing takes 2–4 weeks" },
  ],
  "visa-action": [
    { label: "Contact an immigration attorney this week — not next week", note: "Grace periods are short and have hard cutoffs" },
    { label: "Confirm your exact authorized stay period and options" },
    { label: "Start exploring new sponsoring employers in parallel" },
  ],
  "equity-review": [
    { label: "Log into your equity portal (Carta, Schwab, E*TRADE) immediately" },
    { label: "Note your post-termination exercise window exactly", note: "Often 90 days — but can be shorter" },
    { label: "Consult a financial advisor before exercising if values are significant" },
  ],
  "calculate-runway": [
    { label: "List all essential monthly expenses: rent, food, utilities, debt minimums, insurance" },
    { label: "Add all available cash: savings + expected severance" },
    { label: "Divide total cash by monthly expenses = your runway in months" },
  ],
  "master-resume": [
    { label: "Open the resume builder to create and track versions", tab: "resumes" },
  ],
  "apply-first-batch": [
    { label: "Track each application in the Applications tab", tab: "applications" },
  ],
  "networking-list": [
    { label: "Add contacts to the Network tab as you build your list", tab: "network" },
  ],
};

/* ─────────────────────────────────────────
   Phase assignment
───────────────────────────────────────── */
function getTaskPhase(task: Task): PhaseId {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (task.deadline) {
    const deadline = new Date(task.deadline);
    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 14) return "act-now";
  }

  // These are always high-urgency regardless of deadline
  if (["visa-action", "review-severance", "severance-sign-decision", "consider-lawyer"].includes(task.id)) {
    return "act-now";
  }

  const jobSearchCategories = ["Career Clarity", "Resume & Positioning", "Networking"];
  if (jobSearchCategories.includes(task.category || "")) return "career";
  if (task.category === "Job Search") return "execute";

  if (task.priority === "low" || task.optional) return "ongoing";

  return "stabilize";
}

/* ─────────────────────────────────────────
   Deadline helpers
───────────────────────────────────────── */
function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string | undefined }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days === null) return null;

  const isOverdue = days < 0;
  const isCritical = days >= 0 && days <= 7;
  const isWarning = days > 7 && days <= 30;

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Overdue
      </span>
    );
  }
  if (isCritical) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> {days === 0 ? "Due today" : `${days}d`}
      </span>
    );
  }
  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> {new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

/* ─────────────────────────────────────────
   Intake → LayoffData
───────────────────────────────────────── */
function intakeToLayoffData(intake: LayoffIntakeApiResponse): LayoffData {
  let severance: SeveranceData = null;
  if (intake.severanceOffered === "yes" && intake.severancePaymentType === "lump-sum") {
    severance = {
      type: "lump_sum",
      paidDate: intake.lastWorkingDay || intake.terminationDate || "",
      terminationDate: intake.terminationDate || "",
    };
  } else if (intake.severanceOffered === "yes") {
    severance = { type: "payroll", endDate: intake.lastWorkingDay || "" };
  }

  const hsaFsa = intake.hsaFsa || "";
  return {
    layoffId: String(intake.id),
    employmentStatus: "unemployed",
    severance,
    accounts: {
      has401k: "Unsure",
      hasHsa: hsaFsa.toLowerCase().includes("hsa") ? "Yes" : "No",
      hasFsa: hsaFsa.toLowerCase().includes("fsa") ? "Yes" : "No",
      hasCommuter: intake.commuterBenefits === "yes" ? "Yes" : intake.commuterBenefits === "no" ? "No" : "Unsure",
    },
    benefitsStatus: {
      healthPlanActive: intake.healthActive === "yes",
      healthEndDate: intake.healthEndDate || undefined,
    },
    lastRole: intake.jobTitle || undefined,
    lastCompany: intake.employer || undefined,
    terminationDate: intake.terminationDate || undefined,
  };
}

/* ─────────────────────────────────────────
   Roadmap builder
───────────────────────────────────────── */
/* ── Role-category copy helpers ──────────────────────────────
   Minimal conditional copy keyed on role category.
   "other" / unknown → graceful fallbacks.
──────────────────────────────────────────────────────────── */
const ROLE_LABEL: Record<string, string> = {
  engineering: "engineering",
  product: "product management",
  design: "design",
  data: "data & analytics",
  marketing: "marketing",
  sales: "sales",
  operations: "operations",
  finance: "finance",
  management: "leadership",
  other: "",
};

const ROLE_ACHIEVEMENT_HINTS: Record<string, string> = {
  engineering: "• Technologies, languages, and systems you owned\n• Performance improvements: latency, uptime, throughput, scale\n• Scope: team size, users, requests/sec, data volume\n• Architectural decisions and trade-offs you drove",
  product: "• Products or features shipped and their measured outcomes\n• User growth, retention, or engagement metrics you influenced\n• Revenue or cost impact of your roadmap decisions\n• Stakeholder alignment and cross-functional work you led",
  design: "• Products or flows you designed from concept to ship\n• Usability improvements: conversion, task completion, error reduction\n• Design system work, components, or patterns you established\n• Research you ran and decisions it drove",
  data: "• Models built, their accuracy, and business decisions they informed\n• Data pipelines you designed: volume, latency, reliability\n• Analyses that changed a product or business direction\n• Tools or infrastructure that unblocked other teams",
  marketing: "• Campaigns run, channels owned, and results: leads, pipeline, CAC\n• Revenue or pipeline influenced by your work\n• Audience growth: email list, social, community size\n• Brand or content programs you built or scaled",
  sales: "• Quota, attainment percentage, and deal sizes\n• Accounts owned: ARR, churn, expansion\n• Sales cycles shortened or win rates improved\n• Processes or playbooks you built for the team",
  operations: "• Processes you designed or improved: efficiency gain, cost reduction, time saved\n• Programs you managed: scope, budget, team size\n• Cross-functional initiatives you drove to completion\n• Systems or tools you implemented",
  finance: "• Financial models built and decisions they supported\n• Budgets managed, cost savings identified, revenue forecasted\n• Process improvements in reporting, planning, or controls\n• Cross-functional influence on financial outcomes",
  management: "• Team size, scope, and growth you drove\n• People developed, promoted, or hired under your leadership\n• Business outcomes your org delivered\n• Organizational changes or initiatives you led",
  other: "• Specific achievements with quantified impact\n• Scope: team size, budget, users, revenue affected\n• What you owned vs. contributed to\n• Leadership moments and cross-functional impact",
};

const ROLE_NETWORKING_VENUES: Record<string, string> = {
  engineering: "GitHub, relevant Slack communities (e.g. Rands in Repose), local meetups or conferences in your stack, and alumni networks from previous companies.",
  product: "Lenny's Slack, Product School communities, Mind the Product, and any alumni Slack from companies where you've worked.",
  design: "Dribbble, ADPList, Designer Hangout Slack, local UXPA chapters, and portfolio-sharing communities in your specialty.",
  data: "dbt Slack, local PyData or R user groups, Kaggle forums, and LinkedIn communities around your modeling stack.",
  marketing: "Marketing Brew, GrowthHackers, Rev community, and vertical-specific groups in your channel specialty.",
  sales: "RevGenius, Bravado, Modern Sales Pros Slack, and any revenue community tied to your industry vertical.",
  operations: "Chief of Staff Network, Ops professional communities on LinkedIn, and industry-specific ops Slack groups.",
  finance: "CFO Connect, Finance & Accounting groups, alumni networks from accounting firms or finance teams.",
  management: "Reforge community, First Round community, local leadership circles, and peer networks from previous leadership roles.",
  other: "Industry-specific communities, professional associations, LinkedIn groups in your field, and alumni networks from past companies.",
};

const ROLE_LINKEDIN_HEADLINE: Record<string, string> = {
  engineering: `"Senior [Stack] Engineer | [Specialty, e.g. Distributed Systems / Platform] | Open to [target role]"`,
  product: `"Product Manager | [Domain, e.g. B2B SaaS / Consumer Growth] | [Stage, e.g. 0→1 or Scale] | Open to [target role]"`,
  design: `"Product Designer | [Specialty, e.g. Mobile / Design Systems / UX Research] | Open to [target role]"`,
  data: `"Data Scientist / Analyst | [Domain, e.g. ML / Growth Analytics] | Open to [target role]"`,
  marketing: `"Growth / Marketing Leader | [Channel or Function, e.g. Demand Gen / Brand] | Open to [target role]"`,
  sales: `"Account Executive | [Segment, e.g. Mid-Market SaaS / Enterprise] | [Target quota or ARR range] | Open to [target role]"`,
  operations: `"Operations / Program Manager | [Domain] | [Scale, e.g. 100-person org / $50M ARR] | Open to [target role]"`,
  finance: `"Finance Manager / FP&A | [Domain, e.g. SaaS / VC-backed startups] | Open to [target role]"`,
  management: `"Director / VP [Function] | [Domain] | [Scale] | Open to [target role]"`,
  other: `"[Your Title] | [Specialty or Domain] | Open to [target role type]"`,
};

const ROLE_TARGET_EXAMPLE: Record<string, string> = {
  engineering: `"Senior backend engineer at a Series B–D fintech or infrastructure company" is a target. "Software engineer" is not.`,
  product: `"Senior PM at a Series B–C B2B SaaS company, focused on core product" is a target. "Product manager" is not.`,
  design: `"Product designer at a growth-stage consumer app or design-forward B2B tool" is a target. "Designer" is not.`,
  data: `"Senior data scientist at a Series B–D company with a mature data culture" is a target. "Data scientist" is not.`,
  marketing: `"Head of Demand Gen at a B2B SaaS company with $5M–$50M ARR" is a target. "Marketing manager" is not.`,
  sales: `"Senior AE at a Series B–D SaaS company, $150K–$200K OTE, mid-market segment" is a target. "Sales rep" is not.`,
  operations: `"Senior Program Manager at a mid-size tech company (500–2000 employees)" is a target. "Operations person" is not.`,
  finance: `"Senior FP&A Manager at a VC-backed company ($20M–$100M ARR)" is a target. "Finance person" is not.`,
  management: `"Director of Engineering at a late-stage startup or growth-stage company" is a target. "Manager" is not.`,
  other: `"[Senior/Lead] [Your Title] at a [stage/size] [industry] company" is a target. A generic title is not.`,
};

function buildRoadmap(data: LayoffData, intake: LayoffIntakeApiResponse): Task[] {
  const tasks: Task[] = [];
  const company = intake.employer || "your employer";
  const role = intake.jobTitle || "your role";
  const isUrgent = intake.desiredUrgency === "asap";
  const hasVisa = intake.tiedToVisa === "yes";
  const hasSeverance = intake.severanceOffered === "yes";

  // Role category — drives light copy personalization in key tasks
  const roleCategory = getRoleCategory(intake.jobTitle || "");
  const roleCategoryLabel = ROLE_LABEL[roleCategory] || "";

  // ── PHASE 1: PROTECT & STABILIZE ──

  tasks.push({
    id: "process-emotions",
    category: "Mindset & Wellbeing",
    title: "Give yourself space to process this transition",
    explanation: `Being laid off${company !== "your employer" ? ` from ${company}` : ""} is a significant life event. Before jumping into logistics, acknowledge what you're feeling — shock, relief, anxiety, or all three. This isn't time wasted. It's preparation.

Write down how you're feeling. Talk to someone you trust. Separate the emotion from the decision-making you'll need to do over the next few weeks.`,
    why: "The decisions you make in the next 30 days will shape your next chapter. A grounded mindset leads to better negotiations, better choices, and better outcomes than a reactive one.",
    status: "Not started",
    priority: "high",
    estimatedTime: "Ongoing",
  });

  const severanceContext = hasSeverance && intake.severanceAmount
    ? ` Your severance is ${intake.severanceAmount}.`
    : hasSeverance
    ? " You have a severance package — confirm the exact amount."
    : " You have no severance — your runway comes solely from savings.";

  tasks.push({
    id: "calculate-runway",
    category: "Financial Stability",
    title: "Calculate your exact financial runway",
    explanation: `Add up essential monthly expenses: rent/mortgage, food, utilities, insurance, minimum debt payments, subscriptions.${severanceContext} Divide total available cash by monthly expenses. That's your runway in months.

Write this number down. Every other decision flows from it.`,
    why: "Knowing your runway replaces panic with strategy. It tells you whether you have time to be selective, how aggressively to move, and which decisions are urgent vs. optional.",
    status: "Not started",
    priority: "high",
    estimatedTime: "1–2 hours",
  });

  tasks.push({
    id: "collect-documents",
    category: "Financial Stability",
    title: "Collect and organize all employment documents",
    explanation: `Gather and store securely:
• Severance or separation agreement
• Offer letter and employment contract
• Equity plan documents and grant agreements
• Benefits enrollment confirmations
• Last 2–3 pay stubs
• Any HR communications about your termination
• Employee handbook (especially benefits and equity sections)

Create a dedicated folder for everything from ${company !== "your employer" ? company : "this employer"}.`,
    why: "Many critical decisions in the next 30–60 days require referencing these documents. Having them organized prevents missed deadlines and missed money.",
    status: "Not started",
    priority: "high",
    estimatedTime: "1 hour",
  });

  if (hasSeverance) {
    const signDeadline = intake.severanceSignDeadline;
    const amount = intake.severanceAmount ? ` (${intake.severanceAmount})` : "";
    const hasRelease = intake.releaseRequired === "yes";
    const nonCompete = intake.nonCompete === "yes";
    const ncDuration = intake.nonCompeteDuration ? ` for ${intake.nonCompeteDuration}` : "";
    const state = intake.governingLaw ? ` under ${intake.governingLaw} law` : "";

    tasks.push({
      id: "review-severance",
      category: "Legal & Benefits",
      title: "Review your severance agreement before signing",
      explanation: `Your severance package${amount} is a legal contract. Before signing, verify:

• Payment structure — lump sum or salary continuation? Timing?
• What claims you are releasing
• Non-compete restrictions${nonCompete ? `${ncDuration}${state} — this directly limits where you can work next` : ""}
• Confidentiality and non-disparagement obligations
• Equipment return requirements and deadlines
• Whether severance is contingent on anything${hasRelease ? "\n\n⚠️ A release of claims is required. You are waiving your right to sue. If the package is substantial, a 1-hour employment lawyer review ($200–400) is almost always worth it." : ""}`,
      why: "Once signed, this is binding. Reviewing thoroughly may reveal room to negotiate — and ensures you don't accidentally waive something valuable.",
      status: "Not started",
      priority: "high",
      estimatedTime: "2–3 hours",
      ...(signDeadline ? { deadline: signDeadline } : {}),
    });

    if (signDeadline) {
      tasks.push({
        id: "severance-sign-decision",
        category: "Legal & Benefits",
        title: `Decision deadline: sign severance by ${signDeadline}`,
        explanation: `You have until ${signDeadline} to sign your severance agreement. Before that date:

1. Read the full agreement (every clause)
2. Understand what you're releasing and what restrictions apply
3. Decide if the amount${amount} is acceptable or if there's room to negotiate
4. Consider: additional weeks of pay, extended benefits, removal of non-compete, outplacement services, positive reference agreement

If you're unsure about anything, consult an employment attorney before signing.`,
        why: "Missing this deadline means walking away from the offered package. Signing without review means accepting terms you may regret — including restrictions that could cost you a job offer later.",
        status: "Not started",
        priority: "high",
        estimatedTime: "Decision point",
        deadline: signDeadline,
      });
    }

    if (hasRelease) {
      tasks.push({
        id: "consider-lawyer",
        category: "Legal & Benefits",
        title: "Consider having an employment lawyer review the release",
        explanation: `Your agreement requires a release of claims${amount ? ` in exchange for ${amount}` : ""}. An employment attorney can:
• Flag clauses that are overly broad or unenforceable in your state${state ? ` (${intake.governingLaw})` : ""}
• Assess whether the severance is appropriate for your tenure and situation
• Suggest specific language changes to request
• Advise on any potential claims worth preserving

Most offer a 1-hour consultation. Cost: typically $200–400.`,
        why: "Many people discover too late they waived rights worth more than their severance. A small upfront cost can prevent a much larger loss.",
        status: "Not started",
        priority: "medium",
        estimatedTime: "1–2 hours",
        optional: true,
      });
    }
  }

  const healthEndDate = intake.healthEndDate;
  const healthActive = intake.healthActive === "yes";
  const cobraMentioned = intake.cobraMentioned === "yes";
  let healthContext = "";
  if (healthActive && healthEndDate) {
    healthContext = `Your health coverage ends on **${healthEndDate}**. You have a 60-day special enrollment window from that date.`;
  } else if (healthActive) {
    healthContext = "Your health insurance is currently active. Confirm the exact end date with HR — it's usually the last day of the termination month.";
  } else {
    healthContext = "Confirm your health insurance end date with HR immediately.";
  }

  tasks.push({
    id: "health-insurance-plan",
    category: "Legal & Benefits",
    title: "Plan your health insurance transition",
    explanation: `${healthContext}

Your options:
• COBRA — Keep your exact current plan. You pay the full premium (your share + employer share + 2% admin). Most expensive but zero disruption.
• ACA Marketplace — Losing job-based coverage is a qualifying life event. Often 40–70% cheaper than COBRA for comparable coverage.
• Medicaid — Free or low-cost if your projected income qualifies.
• Spouse or partner's plan — Typically the cheapest if available.${cobraMentioned && intake.cobraContributionDetails ? `\n\nFrom your documents: ${intake.cobraContributionDetails}` : ""}

Compare at healthcare.gov before defaulting to COBRA.`,
    why: "A single ER visit without coverage can mean thousands in debt. This has a hard 60-day deadline. Most people overpay on COBRA without knowing their alternatives.",
    status: "Not started",
    priority: "high",
    estimatedTime: "2–3 hours",
    ...(healthEndDate ? { deadline: healthEndDate } : {}),
  });

  const isLumpSum = intake.severancePaymentType === "lump-sum";
  const isContinuation = intake.severancePaymentType === "continued-payroll";
  tasks.push({
    id: "unemployment-filing",
    category: "Financial Stability",
    title: "File for unemployment — at the right time",
    explanation: `You may be eligible for unemployment insurance. Timing matters:
${isLumpSum ? "• You received a lump-sum severance. In many states you can file immediately after your termination date — the lump sum doesn't delay eligibility. Verify your state's specific rules." : ""}
${isContinuation ? "• Your severance is paid as salary continuation. Most states require waiting until salary continuation ends before you can collect UI. Don't file too early — it may be denied or create overpayment issues." : ""}
${!isLumpSum && !isContinuation ? "• Whether you can file now depends on how severance is structured and your state's rules. Confirm the payout type and check your state's UI website." : ""}
${intake.terminationDate ? `\nYour termination date: ${intake.terminationDate}.` : ""}

File as soon as eligible — benefits take 2–4 weeks to arrive and most states have a waiting period.`,
    why: "Unemployment pays 40–60% of prior wages (up to state caps). On a $120K salary, that could be $1,500+/week for up to 26 weeks. Don't leave this on the table.",
    status: "Not started",
    priority: "high",
    estimatedTime: "1–2 hours",
  });

  if (intake.ptoPayoutExpected === "yes") {
    tasks.push({
      id: "pto-payout",
      category: "Financial Stability",
      title: "Confirm your PTO payout",
      explanation: `You're expecting a PTO payout. Verify in writing:
• How many hours or days are outstanding?
• What's the exact dollar amount?
• When will it be paid?
• Is it included in your final paycheck or paid separately?

In most states, accrued PTO must be paid out at termination — but enforcement varies. Confirm before assuming it will arrive automatically.`,
      why: "Depending on your accrual, this could be $1,000–$10,000+. Get it documented in writing so it doesn't get overlooked.",
      status: "Not started",
      priority: "high",
      estimatedTime: "30 minutes",
    });
  }

  const bonusParts = [
    intake.bonusOwed === "yes" ? "bonus" : null,
    intake.commissionOwed === "yes" ? "commissions" : null,
    intake.proRatedBonus === "yes"
      ? `pro-rated bonus${intake.proRatedBonusAmount ? ` (${intake.proRatedBonusAmount})` : ""}`
      : null,
  ].filter(Boolean).join(", ");

  if (bonusParts) {
    tasks.push({
      id: "claim-compensation",
      category: "Financial Stability",
      title: `Confirm owed compensation: ${bonusParts}`,
      explanation: `You've identified ${bonusParts} as potentially owed to you. Before considering this resolved:
• Is the amount defined in your offer letter or comp plan?
• What are the payment terms and timeline?
• Is it contingent on signing the severance or anything else?
• Get confirmation in writing from HR or payroll.

Earned compensation doesn't disappear at termination in most jurisdictions — but you need to actively confirm and claim it.`,
      why: "Unpaid bonuses and commissions are frequently overlooked during the chaos of a layoff. Even small amounts are worth tracking down.",
      status: "Not started",
      priority: "high",
      estimatedTime: "1 hour",
    });
  }

  if (intake.hsaFsa === "yes") {
    tasks.push({
      id: "hsa-fsa-action",
      category: "Benefits & Admin",
      title: "Act on your HSA and/or FSA before coverage ends",
      explanation: `You have an HSA or FSA. Actions by type:

HSA — Your balance is yours permanently regardless of employment. Move it to a personal HSA custodian (Fidelity, Lively) to maintain full control and avoid employer-associated fees. You can continue investing HSA funds tax-free.

FSA — This is use-it-or-lose-it. You have access to your full annual elected amount now. Spend the remaining balance on eligible expenses (dental, vision, prescription, medical equipment, OTC medications) before your coverage end date. Stock up now.`,
      why: "FSA funds expire when your employment ends. Many people forfeit hundreds or thousands by not spending in time. HSA funds survive but get abandoned with suboptimal custodians.",
      status: "Not started",
      priority: "high",
      estimatedTime: "1–2 hours",
    });
  }

  if (intake.commuterBenefits === "yes") {
    tasks.push({
      id: "commuter-benefits",
      category: "Benefits & Admin",
      title: "Use your commuter/transit benefit balance",
      explanation: "Check your remaining commuter or transit benefit balance. These accounts typically cannot be cashed out — but you can spend them on eligible transit expenses before your account closes. Buy transit passes, reload a transit card, or use the balance on eligible rideshare expenses.",
      why: "Unused commuter funds expire when your employment ends. Use what you have rather than forfeiting it.",
      status: "Not started",
      priority: "medium",
      estimatedTime: "30 minutes",
    });
  }

  const hasEquity = intake.equityType && !["none", "unsure"].includes(intake.equityType);
  if (hasEquity || intake.unvestedEquity === "yes") {
    const equityLabel = intake.equityType === "rsu" ? "RSUs" : intake.equityType === "options" ? "stock options" : "equity";
    const exerciseDeadline = intake.exerciseDeadline;
    const lastVest = intake.lastVestingDate;

    tasks.push({
      id: "equity-review",
      category: "Legal & Benefits",
      title: `Understand what happens to your ${equityLabel} at termination`,
      explanation: intake.equityType === "options"
        ? `Stock options have a post-termination exercise window — typically 90 days, sometimes less. After this window closes, unexercised options expire worthless.${exerciseDeadline ? `\n\nYour exercise deadline: ${exerciseDeadline}` : "\n\nConfirm your exact exercise deadline immediately from your equity plan documents or your stock administration portal (Carta, Schwab Equity, etc.)."}${lastVest ? `\n\nLast vesting date: ${lastVest}` : ""}

Before the deadline, decide: do you want to exercise? Consider the strike price vs. current fair market value and the tax implications (especially ISOs vs. NSOs).`
        : intake.equityType === "rsu"
        ? `RSUs vest on a schedule. Any unvested RSUs at termination are typically forfeited.${lastVest ? ` Your last vesting date was ${lastVest}.` : ""} Confirm whether you had any partial-period vesting (some agreements include acceleration clauses).${intake.unvestedEquity === "yes" ? "\n\nYou have unvested RSUs — confirm the forfeiture terms and check your equity plan for any acceleration provisions." : ""}`
        : "Review your equity plan documents to understand exactly what happens to your holdings at termination.",
      why: intake.equityType === "options"
        ? "Unexercised options expire after the post-termination window — this is a hard, frequently missed deadline. Missing it means forfeiting potentially significant value."
        : "Understanding exactly what you lose helps you evaluate your severance package. Unvested equity may be negotiable.",
      status: "Not started",
      priority: exerciseDeadline ? "high" : "medium",
      estimatedTime: "1–2 hours",
      ...(exerciseDeadline ? { deadline: exerciseDeadline } : {}),
    });
  }

  tasks.push({
    id: "401k-rollover",
    category: "Benefits & Admin",
    title: "Decide what to do with your 401(k)",
    explanation: `Your ${company !== "your employer" ? company : "employer"} 401(k) options after leaving:

• Roll over to IRA — Most flexible. No tax event, full investment control, typically lower fees. Recommended for most people.
• Roll over to new employer's 401(k) — Good if the new plan has strong low-cost fund options.
• Leave in place — Acceptable if balance is over $5K and the plan has good options.
• Cash out — Avoid: 10% penalty + income tax = you lose 30–40% immediately.

You have time on this decision but don't let it fall off your radar.`,
    why: "This is likely one of your largest financial assets. A few hours of attention can compound into significant value over decades. Abandoned 401(k)s are common and costly.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "1–2 hours",
    optional: true,
  });

  if (intake.nonCompete === "yes") {
    const ncDuration = intake.nonCompeteDuration ? ` for ${intake.nonCompeteDuration}` : "";
    const state = intake.governingLaw ? ` under ${intake.governingLaw} law` : "";
    tasks.push({
      id: "non-compete-review",
      category: "Legal & Benefits",
      title: "Understand your non-compete before applying anywhere",
      explanation: `Your separation agreement includes a non-compete clause${ncDuration}${state}. Before you start applying, understand:
• What roles and companies are restricted
• Geographic scope
• Duration${ncDuration}
• Whether it's likely to be enforced in your state${state ? ` (${intake.governingLaw})` : ""} (California, for example, largely doesn't enforce non-competes)
• Whether future employers expect disclosure

Non-solicitation clauses${intake.nonSolicit === "yes" ? " are also present in your agreement" : ""} restrict recruiting former colleagues.`,
      why: "Violating a non-compete — even inadvertently — can result in your new employer being sued and your offer rescinded. Knowing your restrictions before you start searching prevents costly mistakes.",
      status: "Not started",
      priority: "high",
      estimatedTime: "1–2 hours",
    });
  }

  if (intake.returnEquipmentDeadline) {
    tasks.push({
      id: "equipment-return",
      category: "Benefits & Admin",
      title: `Return company equipment by ${intake.returnEquipmentDeadline}`,
      explanation: `Deadline: ${intake.returnEquipmentDeadline}

Before returning any equipment:
1. Back up any personal files (photos, personal documents — not company IP)
2. Sign out of personal accounts (iCloud, Google, personal apps)
3. Note serial numbers and condition of items being returned
4. Get written confirmation of return (shipping tracking, email receipt, or signed form)

Don't miss this deadline — it's typically tied to your severance terms.`,
      why: "Missing the return deadline can result in deductions from your severance or final paycheck. Documenting the return protects you if there are later disputes.",
      status: "Not started",
      priority: "high",
      estimatedTime: "1–2 hours",
      deadline: intake.returnEquipmentDeadline,
    });
  }

  if (intake.outplacementProvided === "yes") {
    tasks.push({
      id: "outplacement-use",
      category: "Benefits & Admin",
      title: "Activate and use your outplacement services",
      explanation: `You've been offered outplacement services${intake.outplacementDetails ? ` (${intake.outplacementDetails})` : ""}. These typically include resume review, job search coaching, interview prep, and sometimes access to job matching tools.

Enroll as soon as possible — most programs have an activation window, and quality drops significantly the longer you wait.`,
      why: "Outplacement is fully paid for by your employer. Coaching and resume feedback from a career specialist can meaningfully improve your search outcomes.",
      status: "Not started",
      priority: "medium",
      estimatedTime: "Ongoing",
      optional: true,
    });
  }

  if (hasVisa) {
    const visaType = intake.visaType ? ` (${intake.visaType})` : "";
    tasks.push({
      id: "visa-action",
      category: "Legal & Benefits",
      title: `⚠️ Priority: Understand your visa timeline${visaType}`,
      explanation: `Your employment is tied to your visa status${visaType}. A layoff likely starts a grace period — typically 60 days for H-1B, but this varies by visa type and recent policy changes.

During this window, you must:
1. Consult an immigration attorney this week — not next week
2. Understand your exact authorized stay period
3. Evaluate your options: find a new sponsoring employer, change status, or plan your timeline${intake.visaDeadlines ? `\n\nKnown deadlines from your documents: ${intake.visaDeadlines}` : ""}`,
      why: "Overstaying your authorized period carries serious long-term immigration consequences including bars on future entry. This is the single most time-sensitive item in your situation.",
      status: "Not started",
      priority: "high",
      estimatedTime: "Act this week",
    });
  }

  tasks.push({
    id: "secure-references",
    category: "Benefits & Admin",
    title: "Secure professional references while relationships are fresh",
    explanation: `Reach out to former colleagues, your manager, and cross-functional partners now — while the working relationship is recent.

Ask if they're willing to be a professional reference and, if possible, request a LinkedIn recommendation. A written recommendation takes them 15 minutes but lasts for years.${intake.rehireEligible === "yes" ? `\n\nYou're eligible for rehire at ${company !== "your employer" ? company : "your employer"} — your direct manager may be an especially credible reference.` : ""}`,
    why: "References matter most at offer stage — when you're tired and under time pressure. Having them locked in now means one less thing to scramble for.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "1–2 hours",
  });

  // ── PHASE 2: CAREER DIRECTION ──

  tasks.push({
    id: "career-reflect",
    category: "Career Clarity",
    title: "Reflect on what you actually want next",
    explanation: `Before updating your resume or applying anywhere, spend real time with this: What do you want the next chapter to look like?

Think through:
• What energized you in your last role${role !== "your role" ? ` as ${role}` : ""}? What drained you?
• What would you change about scope, level, team, product, or culture?
• Do you want to go deeper, level up, or try something different?
• What matters most right now: compensation, growth, autonomy, impact, balance?

Write your answers down.`,
    why: "Most people rush straight into applications without this reflection and spend months searching toward the same frustrations they just escaped. Two hours here saves two months of misalignment.",
    status: "Not started",
    priority: isUrgent ? "medium" : "high",
    estimatedTime: "2–3 hours",
  });

  tasks.push({
    id: "target-roles",
    category: "Career Clarity",
    title: "Define your target roles and level",
    explanation: `Based on your background${role !== "your role" ? ` as ${role}` : ""}, identify 2–3 specific role titles to target. Consider:
• Same title at a better company — lower risk, faster path
• Next-level title — this layoff may be exactly the opening to level up
• Adjacent roles where your skills transfer well

For each target role: what seniority level? What company size/stage? What industry? What's your target compensation range?

Be specific. ${ROLE_TARGET_EXAMPLE[roleCategory] ?? ROLE_TARGET_EXAMPLE.other}`,
    why: "A focused search with 2–3 clear targets produces dramatically better outcomes than applying to everything. It also makes your resume, LinkedIn, and outreach significantly stronger.",
    status: "Not started",
    priority: "high",
    estimatedTime: "1–2 hours",
  });

  tasks.push({
    id: "market-research",
    category: "Career Clarity",
    title: "Research the market for your target roles",
    explanation: `Spend a focused session understanding the current landscape:
• Are there active openings at companies you're interested in?
• What skills appear in job descriptions consistently?
• What's the compensation range? (Levels.fyi, Glassdoor, LinkedIn Salary)
• Who's hiring vs. who just had layoffs?
• What's the interview process typically like at your top targets?`,
    why: "This prevents wasted effort and misaligned expectations. It surfaces opportunities you didn't know existed and tells you what gaps to address before applying.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "2–3 hours",
  });

  // ── PHASE 3: ASSETS ──

  tasks.push({
    id: "linkedin-update",
    category: "Resume & Positioning",
    title: "Update LinkedIn for your active search",
    explanation: `Your LinkedIn profile will be seen by every recruiter and hiring manager. Make sure it's ready:

1. Set "Open to Work" — choose recruiter-only or public visibility
2. Update your headline to reflect your target direction, not just your last title${ROLE_LINKEDIN_HEADLINE[roleCategory] ? `\n   Example: ${ROLE_LINKEDIN_HEADLINE[roleCategory]}` : ""}
3. Add your most recent role's top 3–5 achievements with metrics while they're fresh
4. Update "About" section with your narrative and what you're targeting
5. Request 2–3 LinkedIn recommendations from former colleagues now
6. Connect with anyone you haven't connected with from ${company !== "your employer" ? company : "your last company"}`,
    why: "60–70% of jobs are filled through connections. Recruiters actively source on LinkedIn. A polished, keyword-rich profile generates inbound interest that reduces the outbound effort needed.",
    status: "Not started",
    priority: "high",
    estimatedTime: "2–3 hours",
  });

  tasks.push({
    id: "master-resume",
    category: "Resume & Positioning",
    title: "Build your master resume document",
    explanation: `Create a comprehensive "everything" version of your resume — all experience, projects, and achievements. This is not the version you send. It's the source you tailor from.

For each role, capture:
${ROLE_ACHIEVEMENT_HINTS[roleCategory] ?? ROLE_ACHIEVEMENT_HINTS.other}

Write this while your recent work at ${company !== "your employer" ? company : "your last company"} is still fresh. Start there — it's where your memory is sharpest and the impact is most recent.`,
    why: "The master resume takes time upfront but makes every tailored version fast and complete. A week from now, you'll start forgetting specifics.",
    status: "Not started",
    priority: "high",
    estimatedTime: "3–5 hours",
  });

  tasks.push({
    id: "layoff-narrative",
    category: "Resume & Positioning",
    title: "Craft your transition narrative",
    explanation: `Prepare a clear, confident answer to "Why did you leave / what happened?"

The most effective framing: brief, factual, forward-looking.

Example: "My position was eliminated as part of a company-wide reduction. It was a difficult but common outcome in the current environment. I've used the time to be thoughtful about what I want next — I'm targeting [X] because [specific reason]."

Practice until it sounds natural, not rehearsed.`,
    why: "Every interviewer will ask. Hesitation or over-explanation signals anxiety. A clean, confident 2-sentence answer builds trust and moves things forward.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "1 hour",
  });

  tasks.push({
    id: "networking-list",
    category: "Networking",
    title: "Build your network outreach list",
    explanation: `Write down everyone who might:
• Know of relevant openings
• Refer you to their company or team
• Give you intel on companies you're targeting
• Connect you to someone valuable

Prioritize: former colleagues and managers${company !== "your employer" ? ` from ${company}` : ""}, industry peers, college connections in your field.

Beyond personal contacts, look in:
${ROLE_NETWORKING_VENUES[roleCategory] ?? ROLE_NETWORKING_VENUES.other}

Aim for 20–30 names. You won't reach all of them — but having the list means you can move quickly when opportunities arise.`,
    why: "Most jobs are never posted. Most offers come through warm introductions. This list is your highest-leverage search asset.",
    status: "Not started",
    priority: isUrgent ? "high" : "medium",
    estimatedTime: "1–2 hours",
  });

  // ── PHASE 4: EXECUTE ──

  tasks.push({
    id: "target-company-list",
    category: "Job Search",
    title: "Build your target company list",
    explanation: `Identify 20–30 companies you'd genuinely want to work for:
• Companies where you have connections
• Companies actively hiring for your target roles
• Companies whose stage, size, and culture match what you want
• Companies you've admired from the outside

Check recent funding rounds and hiring news. A company that just raised a Series B or C is almost always hiring.`,
    why: "A focused target list makes your networking time more effective and your applications more intentional. It's how you move from reactive to strategic.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "2–3 hours",
  });

  tasks.push({
    id: "apply-first-batch",
    category: "Job Search",
    title: `Submit your first 10 ${roleCategoryLabel ? roleCategoryLabel + " " : ""}applications`,
    explanation: `Target 10 specific ${roleCategoryLabel || "roles"} that match your criteria${role !== "your role" ? ` — similar in scope and seniority to your work as ${role}` : ""}. For each:
• Tailor your resume to the job description (use the Tailor tool in the Resumes tab)
• Check if you have any connection at the company for a warm intro
• Write a focused cover note if requested
• Track each application here: company, role, date, contact, status

Quality over volume at this stage. 10 targeted applications will outperform 50 generic ones.`,
    why: "Getting 10 applications out creates real momentum and gives you signal fast. You'll quickly learn what resonates and where interest is highest.",
    status: "Not started",
    priority: "medium",
    estimatedTime: "3–5 hours",
  });

  tasks.push({
    id: "interview-prep",
    category: "Job Search",
    title: "Prepare for interviews before they start",
    explanation: `As applications go out, prepare in parallel — don't wait until you have a call scheduled:

• Prepare 5–7 STAR stories for your top achievements (Situation, Task, Action, Result)
• Research your top 5 target companies deeply — mission, recent news, product, culture
• Prepare thoughtful questions to ask at each interview stage
• Practice "Tell me about yourself" until it flows naturally
• If your role is technical: refresh relevant skills or frameworks`,
    why: "Interviews come faster than expected. Preparing now means you can confidently say yes to opportunities without scrambling.",
    status: "Not started",
    priority: "low",
    estimatedTime: "4–6 hours",
    optional: true,
  });

  return tasks;
}

/* ─────────────────────────────────────────
   Runway-driven priority modifier (PART 1)
   Post-processing pass — does NOT rewrite buildRoadmap.
   Applied at display time so stored task priorities are unchanged.
───────────────────────────────────────── */
function applyRunwayContext(tasks: Task[], runwayMonths: number | null): Task[] {
  if (runwayMonths === null) return tasks;

  // HIGH RISK (< 3 months): boost job search velocity tasks
  const HIGH_RISK_BOOST = ["apply-first-batch", "networking-list", "unemployment-filing"];
  // STABLE (> 6 months): elevate career direction tasks
  const STABLE_ELEVATE = ["career-reflect", "target-roles", "market-research"];

  return tasks.map((task) => {
    if (runwayMonths < 3 && HIGH_RISK_BOOST.includes(task.id)) {
      return { ...task, priority: "high" };
    }
    if (runwayMonths > 6 && STABLE_ELEVATE.includes(task.id)) {
      return { ...task, priority: "high" };
    }
    return task;
  });

  // TODO (PART 5 — future): If user files for unemployment, extend runway calculation.
  // When unemployment status is confirmed: runwayMonths += estimated UI benefit months.
  // This will re-run applyRunwayContext with the updated runwayMonths, automatically
  // downgrading urgency boosts if runway improves above the 3-month threshold.
}

/* ─────────────────────────────────────────
   localStorage migration helpers
───────────────────────────────────────── */
function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function clearLocalStorage(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/* ─────────────────────────────────────────
   API → local type mappers
───────────────────────────────────────── */
function apiResumeToLocal(r: ResumeApiResponse): ResumeVersion {
  return {
    id: String(r.id),
    name: r.name,
    targetRole: r.targetRole ?? "",
    seniorityLevel: r.seniorityLevel ?? undefined,
    lastEdited: r.updatedAt,
    status: (r.status as ResumeVersion["status"]) ?? "draft",
    sourceText: r.content ?? undefined,
  };
}

function apiAppToLocal(a: ApplicationApiResponse): JobApplication {
  return {
    id: String(a.id),
    company: a.company,
    role: a.role,
    jobLink: a.jobLink ?? undefined,
    status: (a.status as JobApplication["status"]) ?? "applied",
    dateApplied: a.dateApplied ?? undefined,
    lastUpdate: a.updatedAt,
    resumeVersion: a.resumeVersionName ?? undefined,
    resumeId: a.resumeId ?? undefined,
    tailored: a.tailored ?? false,
    notes: a.notes ?? undefined,
    interviewDate: a.interviewDate ?? undefined,
  };
}

function apiContactToLocal(c: ContactApiResponse): NetworkContact {
  return {
    id: String(c.id),
    name: c.name,
    company: c.company ?? "",
    relationship: c.relationship ?? "",
    lastContact: c.lastContactDate ?? c.createdAt,
    nextFollowUp: c.nextFollowUpDate ?? undefined,
    notes: c.notes ?? undefined,
  };
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function CareerTransitionDashboard(): React.ReactElement {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [layoffData, setLayoffData] = useState<LayoffData | null>(null);
  const [intake, setIntake] = useState<LayoffIntakeApiResponse | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "resumes" | "applications" | "network">("overview");
  const [showCompleted, setShowCompleted] = useState(false);

  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number | null>(null);
  // Cross-tab action routing from insight cards
  const [openNetworkForm, setOpenNetworkForm] = useState(false);
  const [highlightStaleApps, setHighlightStaleApps] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    async function load() {
      try {
        const intakeData = await fetchLayoffIntake();
        if (!intakeData || intakeData.status !== "completed") {
          router.replace("/onboarding");
          return;
        }
        setIntake(intakeData);
        if (intakeData.monthlyExpenses) {
          setMonthlyExpenses(intakeData.monthlyExpenses);
        }
        const data = intakeToLayoffData(intakeData);
        setLayoffData(data);

        const backendTasks = await fetchTasks<Task>();
        if (backendTasks && backendTasks.length > 0) {
          setTasks(backendTasks);
        } else {
          const initial = buildRoadmap(data, intakeData);
          setTasks(initial);
          await saveTasks(initial);
        }
        setTasksLoaded(true);

        // Load resumes, applications, contacts from backend
        await loadAndMigrateData();
        setDataLoaded(true);
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    }

    async function loadAndMigrateData() {
      const [backendResumes, backendApps, backendContacts] = await Promise.all([
        fetchResumes().catch(() => []),
        fetchApplications().catch(() => []),
        fetchContacts().catch(() => []),
      ]);

      // Resumes
      if (backendResumes.length > 0) {
        setResumes(backendResumes.map(apiResumeToLocal));
      } else {
        const local = readLocalStorage<ResumeVersion[]>("career-transition:user:resumes");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((r) =>
              apiCreateResume({
                name: r.name,
                targetRole: r.targetRole,
                seniorityLevel: r.seniorityLevel,
                content: r.sourceText,
                status: r.status,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((r) => apiResumeToLocal(r!));
          setResumes(saved);
          clearLocalStorage("career-transition:user:resumes");
        }
      }

      // Applications
      if (backendApps.length > 0) {
        setApplications(backendApps.map(apiAppToLocal));
      } else {
        const local = readLocalStorage<JobApplication[]>("career-transition:user:applications");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((a) =>
              apiCreateApplication({
                company: a.company,
                role: a.role,
                jobLink: a.jobLink,
                status: a.status,
                interviewDate: a.interviewDate,
                notes: a.notes,
                dateApplied: a.dateApplied,
                resumeVersionName: a.resumeVersion,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((a) => apiAppToLocal(a!));
          setApplications(saved);
          clearLocalStorage("career-transition:user:applications");
        }
      }

      // Contacts
      if (backendContacts.length > 0) {
        setContacts(backendContacts.map(apiContactToLocal));
      } else {
        const local = readLocalStorage<NetworkContact[]>("career-transition:user:contacts");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((c) =>
              apiCreateContact({
                name: c.name,
                company: c.company,
                relationship: c.relationship,
                lastContactDate: c.lastContact,
                nextFollowUpDate: c.nextFollowUp,
                notes: c.notes,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((c) => apiContactToLocal(c!));
          setContacts(saved);
          clearLocalStorage("career-transition:user:contacts");
        }
      }
    }

    load();
  }, [router, sessionStatus]);

  useEffect(() => {
    if (!tasksLoaded) return;
    saveTasks(tasks).catch((err) => console.error("Error saving tasks:", err));
  }, [tasks, tasksLoaded]);

  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "Done").length / tasks.length) * 100);
  }, [tasks]);

  const weeksSinceLayoff = useMemo(() => {
    if (!layoffData?.terminationDate) return 0;
    const diff = new Date().getTime() - new Date(layoffData.terminationDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
  }, [layoffData?.terminationDate]);

  // Runway computed at component level so it can drive task priority + needs-attention
  const runway = useMemo(() => {
    if (!intake || monthlyExpenses === null) return null;
    return computeRunway(intake, monthlyExpenses);
  }, [intake, monthlyExpenses]);

  // Display tasks = raw tasks with runway-driven priority modifiers applied (view-only, not persisted)
  const displayTasks = useMemo(
    () => applyRunwayContext(tasks, runway?.runwayMonths ?? null),
    [tasks, runway]
  );

  const phasedTasks = useMemo(() => {
    const map = new Map<PhaseId, Task[]>();
    PHASES.forEach((p) => map.set(p.id, []));
    displayTasks.forEach((t) => {
      const phase = getTaskPhase(t);
      map.get(phase)!.push(t);
    });
    return map;
  }, [displayTasks]);

  const urgentTasks = useMemo(
    () => displayTasks.filter((t) => t.priority === "high" && t.status !== "Done" && t.status !== "Skipped"),
    [displayTasks]
  );

  // Job search quality signals — recomputed whenever applications/contacts/resumes change
  const jobSearchInsights = useMemo(
    () =>
      computeJobSearchInsights({
        applications: applications.map((a) => ({
          id: a.id,
          company: a.company,
          role: a.role,
          status: a.status,
          dateApplied: a.dateApplied,
          resumeId: a.resumeId,
          tailored: a.tailored,
        })),
        contacts: contacts.map((c) => ({ id: c.id })),
        resumes: resumes.map((r) => ({
          id: r.id,
          name: r.name,
          targetRole: r.targetRole,
        })),
      }),
    [applications, contacts, resumes]
  );

  const nextBestAction = useMemo(
    () =>
      getNextBestAction({
        insights: jobSearchInsights,
        tasks: displayTasks.map((t) => ({
          id: t.id,
          title: t.title,
          explanation: t.explanation,
          status: t.status,
          priority: t.priority,
          phase: getTaskPhase(t),
        })),
      }),
    [jobSearchInsights, displayTasks]
  );

  function updateTaskStatus(id: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function addTaskNote(taskId: string, text: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const note: TaskNote = { id: `note-${Date.now()}`, text, timestamp: new Date().toISOString() };
        return { ...t, notes: [...(t.notes || []), note] };
      })
    );
  }

  async function addResume(d: { name: string; targetRole: string; seniorityLevel?: string; sourceText?: string }) {
    try {
      const created = await apiCreateResume({
        name: d.name,
        targetRole: d.targetRole,
        seniorityLevel: d.seniorityLevel,
        content: d.sourceText,
        status: "draft",
      });
      const local = apiResumeToLocal(created);
      setResumes((prev) => [...prev, local]);
      return local.id;
    } catch (err) {
      console.error("Failed to create resume:", err);
      return "";
    }
  }

  async function addApplication(d: {
    company: string; role: string; jobLink?: string;
    resumeVersion?: string; resumeId?: number; tailored?: boolean;
  }) {
    const now = new Date().toISOString();
    try {
      const created = await apiCreateApplication({
        company: d.company,
        role: d.role,
        jobLink: d.jobLink,
        status: "applied",
        dateApplied: now,
        resumeVersionName: d.resumeVersion,
        resumeId: d.resumeId,
        tailored: d.tailored,
      });
      setApplications((prev) => [...prev, apiAppToLocal(created)]);
    } catch (err) {
      console.error("Failed to create application:", err);
    }
  }

  async function updateApplication(id: string, updates: Partial<JobApplication>) {
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, lastUpdate: new Date().toISOString() } : a))
    );
    try {
      await apiUpdateApplication(id, {
        company: updates.company,
        role: updates.role,
        jobLink: updates.jobLink,
        status: updates.status,
        interviewDate: updates.interviewDate,
        notes: updates.notes,
        dateApplied: updates.dateApplied,
        resumeVersionName: updates.resumeVersion,
        resumeId: updates.resumeId,
        tailored: updates.tailored,
      });
    } catch (err) {
      console.error("Failed to update application:", err);
    }
  }

  // Called when ApplicationsTab creates a tailored resume inline
  function addResumeFromTailor(resume: ResumeVersion) {
    setResumes((prev) => [...prev, resume]);
  }

  function handleInsightAction(action: string) {
    switch (action) {
      case "tailor_resume":
        setActiveTab("resumes");
        break;
      case "add_contact":
        setOpenNetworkForm(true);
        setActiveTab("network");
        break;
      case "define_roles":
        setActiveTab("tasks");
        break;
      case "follow_up":
        setHighlightStaleApps(true);
        setActiveTab("applications");
        break;
    }
  }

  async function handleSaveExpenses(amount: number) {
    setMonthlyExpenses(amount);
    try {
      await saveMonthlyExpenses(amount);
    } catch (err) {
      console.error("Failed to save monthly expenses:", err);
    }
  }

  async function addContact(name: string, company: string, relationship: string) {
    const now = new Date().toISOString();
    try {
      const created = await apiCreateContact({ name, company, relationship, lastContactDate: now });
      setContacts((prev) => [...prev, apiContactToLocal(created)]);
    } catch (err) {
      console.error("Failed to create contact:", err);
    }
  }

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Action Plan" },
    { id: "resumes", label: "Resumes" },
    { id: "applications", label: "Applications" },
    { id: "network", label: "Network" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Combined sticky header + nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between py-2.5 sm:py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-blue-600 font-semibold text-sm sm:text-base flex-shrink-0">Transition</span>
              <span className="text-gray-300 text-sm hidden sm:inline">·</span>
              <span className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                {layoffData?.lastRole ?? "Your role"} at {layoffData?.lastCompany ?? "your company"}
              </span>
              {weeksSinceLayoff > 0 && (
                <span className="hidden lg:inline text-xs text-gray-400">
                  · Week {weeksSinceLayoff}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link
                href="/onboarding/layoff/summary"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden sm:inline"
              >
                Situation summary
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-600">
                {progress}%
              </span>
            </div>
          </div>

          {/* Nav tabs — horizontally scrollable on mobile */}
          <div className="flex gap-0 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Next Best Action */}
            {mounted && dataLoaded && nextBestAction && (
              <div>
                <NextBestActionCard nba={nextBestAction} onAction={handleInsightAction} />
              </div>
            )}

            {/* Job Search Health */}
            {mounted && dataLoaded && jobSearchInsights.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Job search health
                </h2>
                <div className="flex flex-col gap-3">
                  {jobSearchInsights.slice(0, 3).map((insight) => (
                    <JobSearchInsightCard key={insight.id} insight={insight} onAction={handleInsightAction} />
                  ))}
                </div>
              </div>
            )}

            {/* Stat row */}
            {mounted && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Done" value={`${tasks.filter((t) => t.status === "Done").length}`} sub={`of ${tasks.length}`} color="text-emerald-600" />
                <StatCard label="In Progress" value={`${tasks.filter((t) => t.status === "In progress").length}`} color="text-amber-600" />
                <StatCard label="Resumes" value={dataLoaded ? resumes.length.toString() : "—"} color="text-violet-600" />
                <StatCard label="Applications" value={dataLoaded ? applications.length.toString() : "—"} color="text-blue-600" />
              </div>
            )}

            {/* Financial Runway */}
            {mounted && intake && (
              <div>
                <FinancialRunwayCard
                  intake={intake}
                  monthlyExpenses={monthlyExpenses}
                  onSave={handleSaveExpenses}
                />
              </div>
            )}

            {/* Urgency callout */}
            {(urgentTasks.length > 0 || runway?.riskLevel === "high") && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Needs attention
                  </h2>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    See all tasks <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Synthetic runway warning — shown when runway is high risk */}
                  {runway?.riskLevel === "high" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0 bg-red-500" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-red-800">Limited financial runway</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          You have approximately {runway.runwayMonths.toFixed(1)} months remaining. Accelerate your job search and file for unemployment immediately.
                        </p>
                      </div>
                    </div>
                  )}
                  {urgentTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${task.deadline && daysUntil(task.deadline) !== null && daysUntil(task.deadline)! <= 14 ? "bg-red-500" : "bg-blue-500"}`} />
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-gray-900 truncate">{task.title}</p>
                          {task.deadline && (
                            <span className="text-xs text-gray-400">
                              Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DeadlineBadge deadline={task.deadline} />
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as Status)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white cursor-pointer"
                        >
                          <option>Not started</option>
                          <option>In progress</option>
                          <option>Done</option>
                          <option>Skipped</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase summary */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Your action plan
              </h2>
              <div className="flex flex-col gap-2">
                {PHASES.map((phase) => {
                  const phaseTasks = phasedTasks.get(phase.id) || [];
                  const active = phaseTasks.filter((t) => t.status !== "Done" && t.status !== "Skipped");
                  const done = phaseTasks.filter((t) => t.status === "Done");
                  if (phaseTasks.length === 0) return null;
                  return (
                    <div
                      key={phase.id}
                      className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
                      onClick={() => setActiveTab("tasks")}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${phase.dot}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{phase.label}</p>
                          <p className="text-xs text-gray-400">{phase.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {done.length}/{phaseTasks.length} done
                        </span>
                        {active.length > 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phase.badge}`}>
                            {active.length} left
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Action Plan (Tasks) ── */}
        {activeTab === "tasks" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your Action Plan</h2>
                <p className="text-xs text-gray-400 mt-0.5">Prioritized based on your situation</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="rounded"
                />
                Show completed
              </label>
            </div>

            {PHASES.map((phase) => {
              const phaseTasks = phasedTasks.get(phase.id) || [];
              const visible = showCompleted
                ? phaseTasks
                : phaseTasks.filter((t) => t.status !== "Done" && t.status !== "Skipped");
              if (visible.length === 0) return null;
              return (
                <div key={phase.id} className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${phase.dot}`} />
                    <h3 className="text-sm font-semibold text-gray-900">{phase.label}</h3>
                    <span className="text-xs text-gray-400">— {phase.description}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {visible.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        phaseConfig={phase}
                        onStatusChange={(s) => updateTaskStatus(task.id, s)}
                        onAddNote={(note) => addTaskNote(task.id, note)}
                        onNavigate={(tab) => setActiveTab(tab as typeof activeTab)}
                        runwayRiskLevel={runway?.riskLevel}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Resumes ── */}
        {activeTab === "resumes" && (
          <div>
            <ResumeBuilder
              intakeContext={{
                role: intake?.jobTitle ?? null,
                company: intake?.employer ?? null,
                runwayRiskLevel: runway?.riskLevel ?? null,
              }}
            />
          </div>
        )}

        {/* ── Applications ── */}
        {activeTab === "applications" && (
          !dataLoaded ? (
            <LoadingState label="Loading applications…" />
          ) : (
            <ApplicationsTab
              applications={applications}
              resumes={resumes}
              onAdd={addApplication}
              onUpdate={updateApplication}
              onResumeCreated={addResumeFromTailor}
              insights={jobSearchInsights}
              highlightStale={highlightStaleApps}
              onHighlightStaleHandled={() => setHighlightStaleApps(false)}
            />
          )
        )}

        {/* ── Network ── */}
        {activeTab === "network" && (
          !dataLoaded ? (
            <LoadingState label="Loading contacts…" />
          ) : (
            <NetworkTab
              contacts={contacts}
              onAdd={addContact}
              openForm={openNetworkForm}
              onFormOpened={() => setOpenNetworkForm(false)}
            />
          )
        )}

      </main>
    </div>
  );
}

/* ─────────────────────────────────────────
   FinancialRunwayCard
───────────────────────────────────────── */
function FinancialRunwayCard({
  intake,
  monthlyExpenses,
  onSave,
}: {
  intake: import("@/lib/api/layoffIntake").LayoffIntakeApiResponse;
  monthlyExpenses: number | null;
  onSave: (amount: number) => Promise<void>;
}) {
  const [inputValue, setInputValue] = useState(
    monthlyExpenses ? String(Math.round(monthlyExpenses)) : ""
  );
  const [editing, setEditing] = useState(monthlyExpenses === null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync if parent provides a value after mount (from backend)
  React.useEffect(() => {
    if (monthlyExpenses !== null && editing && inputValue === "") {
      setInputValue(String(Math.round(monthlyExpenses)));
      setEditing(false);
    }
  }, [monthlyExpenses]);

  const runway: RunwayResult | null = monthlyExpenses
    ? computeRunway(intake, monthlyExpenses)
    : null;

  async function handleSave() {
    const raw = inputValue.replace(/[$,\s]/g, "");
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid monthly amount.");
      return;
    }
    setError("");
    setSaving(true);
    await onSave(amount);
    setSaving(false);
    setEditing(false);
  }

  // ── Risk config ──
  const riskConfig = {
    high: {
      bar: "bg-red-500",
      badge: "bg-red-50 text-red-700 border border-red-200",
      panelBg: "bg-red-50 border border-red-100",
      textColor: "text-red-700",
      bulletColor: "bg-red-300",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      label: "High Risk",
      bullets: [
        "Prioritize speed — getting applications out matters more than perfection right now",
        "Focus on networking: warm introductions move faster than cold applications",
        "File for unemployment immediately if you haven't — it extends your runway",
        "Consider roles slightly below your target level if they move faster",
      ],
    },
    medium: {
      bar: "bg-amber-400",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      panelBg: "bg-amber-50 border border-amber-100",
      textColor: "text-amber-700",
      bulletColor: "bg-amber-300",
      icon: <Minus className="w-3.5 h-3.5" />,
      label: "Moderate",
      bullets: [
        "You have breathing room, but maintaining momentum matters",
        "Balance quality applications with consistent weekly outreach",
        "Your network is your most efficient path to interviews",
      ],
    },
    stable: {
      bar: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      panelBg: "bg-emerald-50 border border-emerald-100",
      textColor: "text-emerald-700",
      bulletColor: "bg-emerald-400",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: "Stable",
      bullets: [
        "You have time to be selective — target roles that advance your long-term goals",
        "Use this runway to research deeply and position yourself strategically",
        "Build relationships now, before urgency forces your hand",
      ],
    },
  };

  const MAX_BAR_MONTHS = 18;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Financial Runway
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Estimate based on the inputs you provided</p>
        </div>
        {runway && !editing && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${riskConfig[runway.riskLevel].badge}`}>
            {riskConfig[runway.riskLevel].icon}
            {riskConfig[runway.riskLevel].label}
          </span>
        )}
      </div>

      {/* Input state */}
      {editing ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Enter your estimated monthly expenses so we can calculate how long your funds will last.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Include: rent/mortgage, food, utilities, insurance, minimum debt payments.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="5,000"
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Calculate"}
            </button>
            {monthlyExpenses !== null && (
              <button
                onClick={() => { setEditing(false); setError(""); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      ) : runway ? (
        /* Result state */
        <div>
          {/* Main number */}
          <div className="mb-5">
            <p className="text-3xl font-bold text-gray-900 leading-none">
              ~{runway.runwayMonths < 1
                ? `${Math.round(runway.runwayMonths * 4)} weeks`
                : `${runway.runwayMonths.toFixed(1)} months`}
            </p>
            {runway.isEstimated && (
              <p className="text-xs text-gray-400 mt-1">Estimated — some amounts could not be parsed precisely</p>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${riskConfig[runway.riskLevel].bar}`}
                style={{ width: `${Math.min((runway.runwayMonths / MAX_BAR_MONTHS) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-400">
              <span>0</span>
              <span>6 mo</span>
              <span>12 mo</span>
              <span>18+ mo</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {runway.components.map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">{c.label}</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.amount)}</p>
              </div>
            ))}
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Monthly expenses</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(runway.monthlyExpenses)}/mo</p>
            </div>
            {intake.ptoPayoutExpected === "yes" && (
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">PTO payout</p>
                <p className="text-sm font-semibold text-gray-500 italic">not included</p>
              </div>
            )}
          </div>

          {/* What this means for you */}
          <div className={`rounded-lg px-4 py-4 mb-4 ${riskConfig[runway.riskLevel].panelBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${riskConfig[runway.riskLevel].textColor}`}>
              What this means for you
            </p>
            <div className="flex flex-col gap-2">
              {riskConfig[runway.riskLevel].bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${riskConfig[runway.riskLevel].bulletColor}`} />
                  <p className={`text-sm leading-relaxed ${riskConfig[runway.riskLevel].textColor}`}>{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setEditing(true); setInputValue(String(Math.round(runway.monthlyExpenses))); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Edit expenses
          </button>
        </div>
      ) : (
        /* Severance data missing state */
        <div>
          <p className="text-sm text-gray-500 mb-4">
            No severance data found to calculate a runway. If you received a package, add the details in your{" "}
            <a href="/onboarding/layoff/summary" className="text-blue-600 hover:underline">situation summary</a>.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   LoadingState
───────────────────────────────────────── */
function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   StatCard
───────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {sub && <span className="text-sm font-normal text-gray-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TaskCard
───────────────────────────────────────── */
// Contextual runway lines for key tasks only
const RUNWAY_CONTEXT_LINES: Record<string, Record<"high" | "medium" | "stable", string | null>> = {
  "apply-first-batch": {
    high: "With limited runway, getting applications out now is your highest priority.",
    medium: "Consistent application flow will help you hit your timeline.",
    stable: "You have time to be selective — focus quality over volume.",
  },
  "networking-list": {
    high: "Warm introductions close faster than cold applications — this matters now.",
    medium: "Building your network now creates options over the next few months.",
    stable: "Networking while you have runway gives you access to unpublished opportunities.",
  },
  "master-resume": {
    high: "Get a strong version out quickly — you can refine it as you learn what works.",
    medium: "A polished master resume lets you move fast when opportunities arise.",
    stable: null,
  },
  "linkedin-update": {
    high: "Recruiters are your fastest path to interviews — make your profile ready this week.",
    medium: "Update LinkedIn while you have time to do it well.",
    stable: null,
  },
};

function TaskCard({
  task,
  phaseConfig,
  onStatusChange,
  onAddNote,
  onNavigate,
  runwayRiskLevel,
}: {
  task: Task;
  phaseConfig: typeof PHASES[number];
  onStatusChange: (s: Status) => void;
  onAddNote: (note: string) => void;
  onNavigate: (tab: string) => void;
  runwayRiskLevel?: "high" | "medium" | "stable";
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const isDone = task.status === "Done";
  const isSkipped = task.status === "Skipped";
  const isInactive = isDone || isSkipped;

  const statusColors: Record<Status, string> = {
    "Not started": "text-gray-500 bg-gray-50 border-gray-200",
    "In progress": "text-amber-700 bg-amber-50 border-amber-200",
    "Done": "text-emerald-700 bg-emerald-50 border-emerald-200",
    "Skipped": "text-gray-400 bg-gray-50 border-gray-200",
  };

  const guidedActions = GUIDED_ACTIONS[task.id] || [];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl border-l-4 ${phaseConfig.border} transition-colors ${isInactive ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <button
            onClick={() => onStatusChange(isDone ? "Not started" : "Done")}
            className="mt-0.5 shrink-0 text-gray-300 hover:text-emerald-500 transition-colors"
            title={isDone ? "Mark not started" : "Mark done"}
          >
            {isDone
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <Circle className="w-5 h-5" />}
          </button>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <DeadlineBadge deadline={task.deadline} />
              {task.optional && (
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            <h4 className={`text-base font-semibold leading-snug ${isInactive ? "line-through text-gray-400" : "text-gray-900"}`}>
              {task.title}
            </h4>
            {task.estimatedTime && (
              <p className="text-xs text-gray-400 mt-1">{task.estimatedTime}</p>
            )}
            {/* Runway context line — shown only for key tasks when runway is known */}
            {!isInactive && runwayRiskLevel && RUNWAY_CONTEXT_LINES[task.id]?.[runwayRiskLevel] && (
              <p className="text-xs text-blue-600 mt-1.5 leading-snug">
                {RUNWAY_CONTEXT_LINES[task.id][runwayRiskLevel]}
              </p>
            )}
          </div>

          {/* Status dropdown */}
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as Status)}
            className={`text-xs font-medium border rounded-lg px-2 py-1.5 cursor-pointer shrink-0 ${statusColors[task.status]}`}
          >
            <option>Not started</option>
            <option>In progress</option>
            <option>Done</option>
            <option>Skipped</option>
          </select>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 ml-8 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 ml-8">
          {/* Explanation */}
          <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line mb-4">
            {task.explanation}
          </div>

          {/* Why */}
          <div className="text-sm text-gray-500 italic mb-4">
            <span className="font-medium not-italic text-gray-600">Why this matters: </span>
            {task.why}
          </div>

          {/* Guided actions */}
          {guidedActions.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Key steps</p>
              <div className="flex flex-col gap-2.5">
                {guidedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 ${action.href ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600"}`}>
                      {i + 1}
                    </div>
                    <div>
                      {/* Route link */}
                      {action.href ? (
                        <Link
                          href={action.href}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 leading-snug"
                        >
                          {action.label} <ArrowRight className="w-3 h-3 shrink-0" />
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-800 font-medium leading-snug">{action.label}</p>
                      )}
                      {action.note && <p className="text-xs text-gray-500 mt-0.5">{action.note}</p>}
                      {/* Tab navigation button */}
                      {!action.href && action.tab && (
                        <button
                          onClick={() => onNavigate(action.tab!)}
                          className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {action.tab === "resumes" ? "Open resume builder" : action.tab === "applications" ? "Open applications" : "Open network tracker"} <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing notes */}
          {task.notes && task.notes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <div className="flex flex-col gap-2">
                {task.notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-gray-700">{note.text}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{new Date(note.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add note */}
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
              Add a note
            </button>
          ) : (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Track your progress, questions, or blockers…"
                className="w-full min-h-20 p-3 text-sm border border-gray-200 rounded-lg resize-y text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (noteText.trim()) { onAddNote(noteText.trim()); setNoteText(""); setShowNoteInput(false); }
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save note
                </button>
                <button
                  onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   NextBestActionCard
───────────────────────────────────────── */
function NextBestActionCard({
  nba,
  onAction,
}: {
  nba: NextBestAction;
  onAction: (action: string) => void;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl px-6 py-5 text-white shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200 mb-2">
        Your next best move
      </p>
      <p className="text-[17px] font-semibold leading-snug mb-1">{nba.title}</p>
      <p className="text-sm text-blue-100 leading-relaxed mb-4">{nba.description}</p>
      {nba.action && (
        <button
          onClick={() => onAction(nba.action!.type)}
          className="inline-flex items-center gap-1.5 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {nba.action.label} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   JobSearchInsightCard
───────────────────────────────────────── */
function JobSearchInsightCard({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (action: string) => void;
}) {
  const severityStyle = {
    high: "border-l-red-400 bg-red-50",
    medium: "border-l-amber-400 bg-amber-50",
    low: "border-l-gray-300 bg-gray-50",
  }[insight.severity];

  const titleColor = {
    high: "text-red-800",
    medium: "text-amber-800",
    low: "text-gray-700",
  }[insight.severity];

  const descColor = {
    high: "text-red-700",
    medium: "text-amber-700",
    low: "text-gray-600",
  }[insight.severity];

  const actionStyle = {
    high: "border-red-200 text-red-700 hover:bg-red-100",
    medium: "border-amber-200 text-amber-700 hover:bg-amber-100",
    low: "border-gray-200 text-gray-600 hover:bg-gray-100",
  }[insight.severity];

  return (
    <div className={`border border-gray-200 border-l-4 rounded-xl px-5 py-4 ${severityStyle}`}>
      <p className={`text-sm font-semibold mb-1 ${titleColor}`}>{insight.title}</p>
      <p className={`text-sm leading-relaxed ${descColor}`}>{insight.description}</p>
      {insight.recommendation && (
        <p className="text-xs text-gray-500 mt-2 italic">{insight.recommendation}</p>
      )}
      {onAction && insight.actions && insight.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {insight.actions.map((a) => (
            <button
              key={a.action}
              onClick={() => onAction(a.action)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border bg-white/60 transition-colors ${actionStyle}`}
            >
              {a.label} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   ApplicationsTab
───────────────────────────────────────── */
function ApplicationsTab({
  applications, resumes, onAdd, onUpdate, onResumeCreated, insights,
  highlightStale, onHighlightStaleHandled,
}: {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onAdd: (d: {
    company: string; role: string; jobLink?: string;
    resumeVersion?: string; resumeId?: number; tailored?: boolean;
  }) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onResumeCreated: (r: ResumeVersion) => void;
  insights: Insight[];
  highlightStale?: boolean;
  onHighlightStaleHandled?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company: "", role: "", jobLink: "",
    resumeId: null as number | null,
    resumeVersionName: "",
    tailored: false,
  });
  const [showTailorPanel, setShowTailorPanel] = useState(false);
  const [tailorJd, setTailorJd] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState("");
  const [staleHighlightActive, setStaleHighlightActive] = useState(false);
  const staleRef = React.useRef<HTMLDivElement>(null);

  // When parent routes here via "follow up" action, activate stale highlight
  useEffect(() => {
    if (highlightStale) {
      setStaleHighlightActive(true);
      onHighlightStaleHandled?.();
      setTimeout(() => {
        staleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      // Auto-dismiss highlight after 4 seconds
      setTimeout(() => setStaleHighlightActive(false), 4000);
    }
  }, [highlightStale]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColors: Record<string, string> = {
    saved: "text-gray-500 bg-gray-50 border-gray-200",
    applied: "text-blue-700 bg-blue-50 border-blue-200",
    interviewing: "text-violet-700 bg-violet-50 border-violet-200",
    offer: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rejected: "text-red-600 bg-red-50 border-red-200",
    withdrawn: "text-gray-400 bg-gray-50 border-gray-200",
  };

  const selectedResume = resumes.find((r) => r.id === String(form.resumeId));

  async function handleTailorForJob() {
    if (!selectedResume) return;
    if (!tailorJd.trim()) { setTailorError("Paste the job description first."); return; }
    const content = selectedResume.sourceText;
    if (!content) { setTailorError("This resume has no text content available. Open the Resume tab to export it first."); return; }

    setTailoring(true);
    setTailorError("");
    try {
      const res = await fetch("/api/resumes/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContent: content, resumeName: selectedResume.name, jobDescription: tailorJd }),
      });
      if (!res.ok) throw new Error("Tailoring failed");
      const result = await res.json();
      if (result.savedResume) {
        const newResume: ResumeVersion = {
          id: String(result.savedResume.id),
          name: result.savedResume.name,
          targetRole: selectedResume.targetRole,
          lastEdited: result.savedResume.updatedAt,
          status: "draft",
          sourceText: result.tailoredContent,
        };
        onResumeCreated(newResume);
        setForm((f) => ({ ...f, resumeId: result.savedResume.id, resumeVersionName: result.savedResume.name, tailored: true }));
        setShowTailorPanel(false);
        setTailorJd("");
      }
    } catch {
      setTailorError("Tailoring failed. Please try again.");
    } finally {
      setTailoring(false);
    }
  }

  function resetForm() {
    setForm({ company: "", role: "", jobLink: "", resumeId: null, resumeVersionName: "", tailored: false });
    setShowTailorPanel(false);
    setTailorJd("");
    setTailorError("");
    setShowForm(false);
  }

  function handleAdd() {
    if (!form.company || !form.role) return;
    onAdd({
      company: form.company,
      role: form.role,
      jobLink: form.jobLink || undefined,
      resumeVersion: form.resumeVersionName || undefined,
      resumeId: form.resumeId ?? undefined,
      tailored: form.tailored,
    });
    resetForm();
  }

  // Per-application inline warnings
  const resumesForInsights = resumes.map((r) => ({ id: r.id, name: r.name, targetRole: r.targetRole }));
  const appsForInsights = applications.map((a) => ({
    id: a.id, company: a.company, role: a.role, status: a.status,
    dateApplied: a.dateApplied, resumeId: a.resumeId, tailored: a.tailored,
  }));

  // High-severity insights shown at top of Applications tab
  const highInsights = insights.filter((i) => i.severity === "high");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Job Applications</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* High-severity insights at top of tab */}
      {highInsights.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {highInsights.map((i) => <JobSearchInsightCard key={i.id} insight={i} />)}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Application</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company *</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Senior Product Manager"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Job Link</label>
              <input value={form.jobLink} onChange={(e) => setForm({ ...form, jobLink: e.target.value })} placeholder="https://..."
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Resume selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Resume</label>
              <select
                value={form.resumeId ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? parseInt(e.target.value) : null;
                  const r = resumes.find((r) => r.id === e.target.value);
                  setForm({ ...form, resumeId: id, resumeVersionName: r?.name ?? "", tailored: false });
                  setShowTailorPanel(false);
                }}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="">No resume selected</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.targetRole ? ` — ${r.targetRole}` : ""}
                  </option>
                ))}
              </select>
              {form.tailored && (
                <p className="text-xs text-violet-600 mt-1 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Tailored resume selected
                </p>
              )}
            </div>

            {/* Tailor for this job */}
            {selectedResume && !form.tailored && (
              <div>
                {!showTailorPanel ? (
                  <button
                    type="button"
                    onClick={() => setShowTailorPanel(true)}
                    className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Tailor resume for this job
                  </button>
                ) : (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-violet-800 mb-2">Tailor "{selectedResume.name}" for this role</p>
                    <textarea
                      value={tailorJd}
                      onChange={(e) => setTailorJd(e.target.value)}
                      placeholder="Paste the job description here…"
                      className="w-full text-xs px-3 py-2 border border-violet-200 rounded-lg resize-none h-28 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
                    />
                    {tailorError && <p className="text-xs text-red-500 mb-2">{tailorError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleTailorForJob}
                        disabled={tailoring}
                        className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {tailoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {tailoring ? "Tailoring…" : "Generate tailored resume"}
                      </button>
                      <button type="button" onClick={() => { setShowTailorPanel(false); setTailorJd(""); setTailorError(""); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Add application
              </button>
              <button onClick={resetForm}
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-3xl mb-4">📋</div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Start tracking your applications here</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Log each role you apply to — keeping a record helps you follow up, spot patterns, and stay organized.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add your first application
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {(["applied", "interviewing", "offer"] as const).map((s) => (
              <div key={s} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${s === "applied" ? "text-blue-600" : s === "interviewing" ? "text-violet-600" : "text-emerald-600"}`}>
                  {applications.filter((a) => a.status === s).length}
                </div>
                <div className="text-xs text-gray-400 capitalize">{s}</div>
              </div>
            ))}
          </div>

          <div ref={staleRef} className="flex flex-col gap-3">
            {staleHighlightActive && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700 font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Applications highlighted below haven't moved in over 2 weeks — consider sending a follow-up or marking them rejected.
              </div>
            )}
            {applications.map((app) => {
              const warnings = getApplicationWarnings(
                { id: app.id, company: app.company, role: app.role, status: app.status, dateApplied: app.dateApplied, resumeId: app.resumeId, tailored: app.tailored },
                appsForInsights,
                resumesForInsights
              );
              const isStale = staleHighlightActive && app.status === "applied" && app.dateApplied
                && (Date.now() - new Date(app.dateApplied).getTime() > 14 * 24 * 60 * 60 * 1000);
              return (
                <div key={app.id} className={`bg-white border rounded-xl p-5 transition-all ${isStale ? "border-amber-400 ring-2 ring-amber-200" : "border-gray-200"}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{app.role}</h3>
                      <p className="text-sm text-gray-500">{app.company}</p>
                      {app.jobLink && (
                        <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                          View posting →
                        </a>
                      )}
                    </div>
                    <select
                      value={app.status}
                      onChange={(e) => onUpdate(app.id, { status: e.target.value as JobApplication["status"] })}
                      className={`text-xs font-medium border rounded-lg px-2 py-1.5 cursor-pointer ${statusColors[app.status] || statusColors.saved}`}
                    >
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  {/* Resume context + tailored badge */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-1">
                    {app.dateApplied && <span>Applied {new Date(app.dateApplied).toLocaleDateString()}</span>}
                    {app.resumeVersion && (
                      <span className="flex items-center gap-1">
                        {app.tailored && (
                          <span className="inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                            <Wand2 className="w-2.5 h-2.5" /> Tailored
                          </span>
                        )}
                        {app.resumeVersion}
                      </span>
                    )}
                  </div>

                  {/* Inline warnings (PART 7) */}
                  {warnings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {warnings.map((w) => (
                        <span key={w} className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   NetworkTab
───────────────────────────────────────── */
function NetworkTab({
  contacts, onAdd, openForm, onFormOpened,
}: {
  contacts: NetworkContact[];
  onAdd: (name: string, company: string, relationship: string) => void;
  openForm?: boolean;
  onFormOpened?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", relationship: "" });

  // Open contact form when parent triggers "add_contact" action
  useEffect(() => {
    if (openForm) {
      setShowForm(true);
      onFormOpened?.();
    }
  }, [openForm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Network & Outreach</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Contact</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Relationship</label>
              <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Former manager"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (form.name) { onAdd(form.name, form.company, form.relationship); setForm({ name: "", company: "", relationship: "" }); setShowForm(false); } }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Add contact
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-3xl mb-4">🤝</div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Add your first contact</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Warm introductions convert to interviews at a much higher rate than cold applications. Start with former colleagues, managers, or classmates.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add a contact
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.company}{contact.relationship ? ` · ${contact.relationship}` : ""}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(contact.lastContact).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
