/**
 * Daily Focus — picks a single high-priority action for today
 * based on timeline phase, incomplete tasks, and days since layoff.
 */

import type { Task, TimelinePhase } from "@/app/onboarding/layoff/shared/types";

export type DailyFocus = {
  title: string;
  description: string;
  href?: string;
  category: "urgent" | "important" | "growth";
};

// Phase-specific default nudges when no urgent tasks exist
const PHASE_NUDGES: Record<TimelinePhase, DailyFocus> = {
  stabilize: {
    title: "File for unemployment insurance",
    description: "This is free money you're entitled to. Most states let you file online in 15 minutes.",
    href: "/onboarding/layoff/tasks",
    category: "urgent",
  },
  prepare: {
    title: "Update your resume",
    description: "Tailor your resume for the roles you're targeting. A focused resume gets 3x more callbacks.",
    href: "/onboarding/layoff/resumes",
    category: "important",
  },
  execute: {
    title: "Send 3 applications today",
    description: "Consistent daily applications compound. Quality matters, but momentum matters more.",
    href: "/onboarding/layoff/applications",
    category: "important",
  },
  persist: {
    title: "Follow up on pending applications",
    description: "A brief, friendly follow-up after 5-7 days can move you to the top of the pile.",
    href: "/onboarding/layoff/applications",
    category: "growth",
  },
};

// Day-specific nudges (override phase nudges for key milestones)
const DAY_NUDGES: Record<number, DailyFocus> = {
  1: {
    title: "Take a breath — then handle the essentials",
    description: "Today: review your severance letter carefully, note any deadlines, and take stock of your finances.",
    href: "/onboarding/layoff/runway",
    category: "urgent",
  },
  3: {
    title: "File for unemployment benefits",
    description: "Do this early. Processing takes 2-3 weeks in most states. The sooner you file, the sooner payments start.",
    href: "/onboarding/layoff/tasks",
    category: "urgent",
  },
  7: {
    title: "Review your health insurance options",
    description: "You typically have 60 days to elect COBRA. Compare it with ACA marketplace plans — you might save significantly.",
    href: "/onboarding/layoff/runway",
    category: "urgent",
  },
  14: {
    title: "Start reaching out to your network",
    description: "80% of jobs come through connections. Send 5 messages today to former colleagues, mentors, or industry contacts.",
    href: "/onboarding/layoff/network",
    category: "important",
  },
  30: {
    title: "Review and adjust your strategy",
    description: "One month in — check your application stats, runway, and job search approach. Adjust what isn't working.",
    href: "/onboarding/layoff/dashboard",
    category: "important",
  },
};

export function getDailyFocus(
  daysSinceLayoff: number,
  timelinePhase: TimelinePhase,
  tasks: Task[],
): DailyFocus {
  // 1. Check for urgent incomplete tasks (deadlines within 3 days)
  const now = new Date();
  const urgentTask = tasks.find((t) => {
    if (t.status === "Done" || t.status === "Skipped") return false;
    if (t.priority !== "high") return false;
    if (!t.deadline) return false;
    const due = new Date(t.deadline);
    const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 3;
  });

  if (urgentTask) {
    return {
      title: urgentTask.title,
      description: `This is due soon. Completing it today keeps you on track.`,
      href: "/onboarding/layoff/tasks",
      category: "urgent",
    };
  }

  // 2. Check for day-specific milestone nudges (within ±1 day)
  for (const [day, nudge] of Object.entries(DAY_NUDGES)) {
    if (Math.abs(daysSinceLayoff - Number(day)) <= 1) {
      return nudge;
    }
  }

  // 3. Fall back to phase-appropriate nudge
  return PHASE_NUDGES[timelinePhase];
}
