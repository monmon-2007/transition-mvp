import { LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import { getRoleCategory } from "@/lib/jobSearchInsights";
import type { Task, LayoffData, SeveranceData, PhaseId, TimeBucket } from "./types";

export const GUIDED_ACTIONS: Record<string, { label: string; note?: string; href?: string; tab?: string }[]> = {
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

export function getTaskPhase(task: Task): PhaseId {
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

export function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function intakeToLayoffData(intake: LayoffIntakeApiResponse): LayoffData {
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

export const ROLE_LABEL: Record<string, string> = {
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

export const ROLE_ACHIEVEMENT_HINTS: Record<string, string> = {
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

export const ROLE_NETWORKING_VENUES: Record<string, string> = {
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

export const ROLE_LINKEDIN_HEADLINE: Record<string, string> = {
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

export const ROLE_TARGET_EXAMPLE: Record<string, string> = {
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

export function buildRoadmap(data: LayoffData, intake: LayoffIntakeApiResponse): Task[] {
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

/**
 * Smart roadmap: max ~15 tasks, organized by time buckets, time-aware.
 * Used for new task generation. Existing saved tasks are loaded from backend, not regenerated.
 */
export function buildSmartRoadmap(
  data: LayoffData,
  intake: LayoffIntakeApiResponse,
  weeksSinceLayoff: number
): Task[] {
  // Generate the full roadmap first, then filter and assign time buckets
  const allTasks = buildRoadmap(data, intake);

  // IDs to remove entirely — merged into other experiences or low value
  const REMOVE_IDS = new Set([
    "process-emotions",    // → dashboard welcome message instead
    "collect-documents",   // → merged into doc upload experience
  ]);

  // IDs that are only included in "when-ready" if relevant data exists
  const WHEN_READY_ONLY = new Set([
    "401k-rollover",
    "commuter-benefits",
    "outplacement-use",
    "interview-prep",
  ]);

  // Collapse severance review + sign decision when deadline >14 days away
  let collapseSignDecision = false;
  if (intake.severanceSignDeadline) {
    const daysLeft = daysUntil(intake.severanceSignDeadline);
    if (daysLeft !== null && daysLeft > 14) collapseSignDecision = true;
  }

  // Collapse career-reflect + target-roles into one
  const COLLAPSE_CAREER = new Set(["target-roles"]);

  let filtered = allTasks.filter((t) => {
    if (REMOVE_IDS.has(t.id)) return false;
    if (collapseSignDecision && t.id === "severance-sign-decision") return false;
    if (COLLAPSE_CAREER.has(t.id)) return false;
    return true;
  });

  // Update career-reflect to include target-roles content
  filtered = filtered.map((t) => {
    if (t.id === "career-reflect") {
      return {
        ...t,
        title: "Reflect on what you want next and define target roles",
        explanation: t.explanation + "\n\nOnce you have clarity, define 2–3 specific role titles to target. Be specific about seniority, company size/stage, and industry.",
      };
    }
    return t;
  });

  // Assign time buckets based on week and task characteristics
  const bucketed = filtered.map((t) => {
    const bucket = assignTimeBucket(t, weeksSinceLayoff, WHEN_READY_ONLY);
    return { ...t, timeBucket: bucket };
  });

  // Sort within buckets by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  bucketed.sort((a, b) => {
    const bucketOrder = { "do-now": 0, "this-week": 1, "when-ready": 2 };
    const bucketDiff = bucketOrder[a.timeBucket!] - bucketOrder[b.timeBucket!];
    if (bucketDiff !== 0) return bucketDiff;
    return (priorityOrder[a.priority || "medium"] || 1) - (priorityOrder[b.priority || "medium"] || 1);
  });

  // Cap: 5 do-now, 5 this-week, 5 when-ready
  const doNow = bucketed.filter((t) => t.timeBucket === "do-now").slice(0, 5);
  const thisWeek = bucketed.filter((t) => t.timeBucket === "this-week").slice(0, 5);
  const whenReady = bucketed.filter((t) => t.timeBucket === "when-ready").slice(0, 5);

  const result = [...doNow, ...thisWeek, ...whenReady];

  // For quick-start users with very little data, add a meta-task
  if (intake.status === "quick-start") {
    const filledFields = [intake.employer, intake.jobTitle, intake.terminationDate, intake.severanceOffered, intake.healthActive].filter(Boolean).length;
    if (filledFields < 3) {
      result.push({
        id: "complete-profile",
        category: "Setup",
        title: "Complete your profile for a personalized plan",
        explanation: "The more we know about your situation, the more specific and useful your action plan becomes. Fill in details like your termination date, severance info, and health insurance status.",
        why: "A personalized plan with deadlines and dollar amounts is dramatically more useful than a generic checklist.",
        status: "Not started",
        priority: "medium",
        estimatedTime: "5 minutes",
        timeBucket: "this-week",
      });
    }
  }

  return result;
}

function assignTimeBucket(
  task: Task,
  weeksSinceLayoff: number,
  whenReadyOnly: Set<string>
): Task["timeBucket"] {
  // Deadline tasks always go to "do-now"
  if (task.deadline) {
    const days = daysUntil(task.deadline);
    if (days !== null && days <= 14) return "do-now";
    if (days !== null && days <= 30) return "this-week";
  }

  // When-ready-only tasks
  if (whenReadyOnly.has(task.id)) return "when-ready";

  // Visa is always urgent
  if (task.id === "visa-action") return "do-now";

  // Time-aware bucketing
  const category = task.category || "";

  if (weeksSinceLayoff <= 2) {
    // Stabilize phase: severance, benefits, finances, unemployment
    if (["Legal & Benefits", "Financial Stability", "Benefits & Admin"].includes(category)) return "do-now";
    if (["Career Clarity", "Resume & Positioning"].includes(category)) return "this-week";
    return "when-ready";
  }

  if (weeksSinceLayoff <= 4) {
    // Prepare phase: resume, LinkedIn, networking
    if (["Resume & Positioning", "Networking", "Career Clarity"].includes(category)) return "do-now";
    if (task.deadline) return "do-now"; // Keep deadline items visible
    if (["Legal & Benefits", "Financial Stability"].includes(category)) return "this-week";
    return "when-ready";
  }

  // Week 5+: Execute phase
  if (["Job Search"].includes(category)) return "do-now";
  if (["Resume & Positioning", "Networking"].includes(category)) return "do-now";
  if (task.deadline) return "do-now";
  if (task.priority === "high") return "this-week";
  return "when-ready";
}

export function applyRunwayContext(tasks: Task[], runwayMonths: number | null): Task[] {
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
