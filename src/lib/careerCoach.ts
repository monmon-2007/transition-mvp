/**
 * AI Career Coach — Adaptive guidance engine
 *
 * Analyzes user's current state across all dimensions and provides
 * personalized strategic advice. This is the "brain" that reads
 * the user's data and generates coaching insights.
 */

import type { TimelinePhase } from "@/app/onboarding/layoff/shared/types";
import type { RiskLevel } from "./runway";

export type CoachingInsight = {
  id: string;
  title: string;
  body: string;
  category: "strategy" | "warning" | "encouragement" | "action";
  priority: number; // 1 = highest
};

export type UserState = {
  weeksSinceLayoff: number;
  timelinePhase: TimelinePhase;
  runwayMonths?: number;
  runwayRisk?: RiskLevel;
  applicationCount: number;
  interviewCount: number;
  offerCount: number;
  contactCount: number;
  tasksCompleted: number;
  totalTasks: number;
  hasSeverance: boolean;
  hasResume: boolean;
  resumeCount: number;
  fairnessRating?: string;
  recentApplicationDays?: number; // days since last application
  recentContactDays?: number;     // days since last contact added
};

/**
 * Generate personalized coaching insights based on user state.
 * Returns 2-4 insights sorted by priority.
 */
export function generateCoachingInsights(state: UserState): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const weeks = state.weeksSinceLayoff;

  // ── Runway warnings ──
  if (state.runwayRisk === "high" && state.runwayMonths !== undefined) {
    if (state.interviewCount === 0) {
      insights.push({
        id: "runway-critical-no-interviews",
        title: "Your runway is short and you have no interviews yet",
        body: `With ~${state.runwayMonths.toFixed(1)} months of runway and no active interviews, speed is critical. Consider: (1) broadening your role criteria, (2) applying to 3-5 jobs daily, (3) reaching out to 5 contacts this week for warm referrals. Referrals move 4x faster than cold applications.`,
        category: "warning",
        priority: 1,
      });
    } else {
      insights.push({
        id: "runway-critical-with-interviews",
        title: "Your runway is tight — but you have momentum",
        body: `You have ${state.interviewCount} active interview(s) with ~${state.runwayMonths.toFixed(1)} months of runway. Focus on converting these. Meanwhile, don't stop applying — the best negotiating position is having multiple options.`,
        category: "strategy",
        priority: 2,
      });
    }
  }

  // ── Application velocity ──
  if (state.applicationCount === 0 && weeks > 1) {
    insights.push({
      id: "no-applications",
      title: "You haven't tracked any applications yet",
      body: "The job search hasn't started until you're applying. Even if you're still processing the layoff, sending one application today breaks the inertia. Start with a role that excites you — it doesn't have to be perfect.",
      category: "action",
      priority: 1,
    });
  } else if (state.recentApplicationDays && state.recentApplicationDays > 7 && state.interviewCount === 0) {
    insights.push({
      id: "application-stall",
      title: "Your application momentum has stalled",
      body: `It's been ${state.recentApplicationDays} days since your last application with no active interviews. Job searching is a volume game with a quality filter. Aim for 3-5 targeted applications per week. If you're spending too long per application, try the 80/20 rule: a good-enough tailored resume beats a perfect one sent too late.`,
      category: "warning",
      priority: 2,
    });
  }

  // ── Interview pipeline ──
  if (state.interviewCount > 0 && state.offerCount === 0) {
    insights.push({
      id: "interview-to-offer",
      title: `You have ${state.interviewCount} active interview(s) — keep the pipeline full`,
      body: "Don't stop applying while interviewing. Companies ghost, processes stall, and offers fall through. The candidates who land fastest are the ones who keep multiple threads alive. Your leverage also improves when you can mention competing timelines.",
      category: "strategy",
      priority: 3,
    });
  }

  // ── Network underutilization ──
  if (state.contactCount < 3 && weeks > 2) {
    insights.push({
      id: "network-underused",
      title: "Your network is your most underused asset",
      body: `You have ${state.contactCount} contacts tracked. Research shows 80% of jobs are filled through connections, not job boards. This week, reach out to 5 former colleagues, managers, or industry peers. A simple "I'm exploring new opportunities and would love your perspective" is enough.`,
      category: "action",
      priority: 2,
    });
  } else if (state.recentContactDays && state.recentContactDays > 14) {
    insights.push({
      id: "network-dormant",
      title: "Time to re-engage your network",
      body: "It's been over 2 weeks since you added a contact. Networking isn't a one-time activity — it's the engine of your job search. Follow up with existing contacts and add new ones weekly. People want to help; they just need to know you're looking.",
      category: "action",
      priority: 3,
    });
  }

  // ── Resume optimization ──
  if (state.hasResume && state.applicationCount > 5 && state.interviewCount === 0) {
    insights.push({
      id: "resume-not-converting",
      title: "You're applying but not getting interviews — your resume may need work",
      body: "A 0% interview rate after 5+ applications suggests your resume isn't getting through. Try: (1) Use the JD match tool to identify keyword gaps, (2) Tailor your resume for each application, (3) Lead with measurable achievements, not job descriptions. Consider having someone outside your field read it for clarity.",
      category: "strategy",
      priority: 2,
    });
  }

  // ── Severance negotiation ──
  if (state.hasSeverance && state.fairnessRating === "below" && weeks < 3) {
    insights.push({
      id: "severance-below",
      title: "Your severance is below typical — negotiation could pay off",
      body: "Your package scores below the median for your profile. Most initial severance offers aren't final. A professional, specific ask — even a brief email — rarely hurts and can yield thousands more. Check the Severance Review tool to draft a negotiation email.",
      category: "action",
      priority: 1,
    });
  }

  // ── Offer evaluation ──
  if (state.offerCount > 0) {
    insights.push({
      id: "has-offer",
      title: "You have an offer — don't rush to accept",
      body: "Take the full decision window. Use the Offer Comparison tool to evaluate total comp (not just base). If this is your only offer, keep other applications warm — having alternatives gives you leverage even if you plan to accept. Consider: growth trajectory, manager quality, and team culture alongside compensation.",
      category: "strategy",
      priority: 1,
    });
  }

  // ── Emotional check-in ──
  if (weeks >= 4 && weeks <= 6 && state.interviewCount === 0) {
    insights.push({
      id: "month-check-in",
      title: "One month in — this is normal, and it gets easier",
      body: "The average tech job search takes 3-6 months. If you're feeling frustrated or discouraged, that's completely normal. The first month is often the hardest because you're building from scratch. Your systems are in place now — this is when consistency starts to compound.",
      category: "encouragement",
      priority: 4,
    });
  }

  if (weeks >= 8 && state.applicationCount > 10 && state.interviewCount === 0) {
    insights.push({
      id: "pivot-consideration",
      title: "Consider adjusting your approach",
      body: "After 10+ applications with no interviews over 8 weeks, something in the strategy may need to shift. Common adjustments: (1) target a different seniority level, (2) expand to adjacent industries, (3) get your resume reviewed by someone in hiring, (4) focus more on referral-based applications. Sometimes a small change unlocks everything.",
      category: "strategy",
      priority: 2,
    });
  }

  // ── Encouragement milestones ──
  if (state.tasksCompleted >= 5 && state.tasksCompleted <= 7) {
    insights.push({
      id: "early-momentum",
      title: "You're building real momentum",
      body: `${state.tasksCompleted} tasks completed. Most people who go through a layoff never build a structured plan — you have. Keep going. The next few weeks are where consistency separates those who land quickly from those who drift.`,
      category: "encouragement",
      priority: 5,
    });
  }

  // Sort by priority and return top 3
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}
