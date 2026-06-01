import { LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";

export type Urgency = "critical" | "high" | "medium";

export type AttentionItem = {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  deadline?: string;
  daysUntil?: number;
};

export function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function buildAttentionItems(intake: LayoffIntakeApiResponse): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (intake.tiedToVisa === "yes") {
    items.push({
      id: "visa",
      title: "Your work authorization requires immediate action",
      description: `Your employment was tied to your ${intake.visaType || "work visa"}. A layoff typically starts a limited grace period — usually 60 days for H-1B. Contact an immigration attorney this week, not next week.`,
      urgency: "critical",
    });
  }

  if (intake.severanceOffered === "yes" && intake.severanceSignDeadline) {
    const days = daysUntilDate(intake.severanceSignDeadline);
    if (days !== null) {
      items.push({
        id: "severance-deadline",
        title: `Sign or decline severance by ${formatDate(intake.severanceSignDeadline)}`,
        description: `${days <= 0 ? "This deadline has passed." : `${days} day${days !== 1 ? "s" : ""} remaining.`} Review every clause before signing — especially the release of claims${intake.severanceAmount ? ` in exchange for ${intake.severanceAmount}` : ""}. You may be able to negotiate.`,
        urgency: days <= 0 ? "critical" : days <= 5 ? "critical" : days <= 14 ? "high" : "medium",
        deadline: intake.severanceSignDeadline,
        daysUntil: days,
      });
    }
  }

  if (intake.returnEquipmentDeadline) {
    const days = daysUntilDate(intake.returnEquipmentDeadline);
    if (days !== null && days <= 21) {
      items.push({
        id: "equipment",
        title: `Return company equipment by ${formatDate(intake.returnEquipmentDeadline)}`,
        description: "Missing this can result in deductions from your severance or final pay. Back up personal files first and document the return with tracking confirmation.",
        urgency: days <= 3 ? "critical" : "high",
        deadline: intake.returnEquipmentDeadline,
        daysUntil: days,
      });
    }
  }

  if (intake.exerciseDeadline) {
    const days = daysUntilDate(intake.exerciseDeadline);
    if (days !== null && days <= 90) {
      items.push({
        id: "equity",
        title: `Stock option exercise window closes ${formatDate(intake.exerciseDeadline)}`,
        description: "Options expire after this date with no recovery. Review your grant documents and consult a financial advisor if the value is significant before the deadline.",
        urgency: days <= 14 ? "critical" : "high",
        deadline: intake.exerciseDeadline,
        daysUntil: days,
      });
    }
  }

  if (intake.healthEndDate) {
    const days = daysUntilDate(intake.healthEndDate);
    if (days !== null && days <= 60) {
      items.push({
        id: "health",
        title: `Health coverage ends ${formatDate(intake.healthEndDate)}`,
        description: "You have a 60-day window from this date to enroll in COBRA or ACA coverage. ACA Marketplace plans are often 40–70% cheaper than COBRA — compare before defaulting.",
        urgency: days <= 7 ? "critical" : days <= 30 ? "high" : "medium",
        deadline: intake.healthEndDate,
        daysUntil: days,
      });
    }
  }

  if (intake.nonCompete === "yes" && items.length < 5) {
    items.push({
      id: "non-compete",
      title: "Non-compete restrictions apply to your next role",
      description: `Your agreement includes a non-compete${intake.nonCompeteDuration ? ` for ${intake.nonCompeteDuration}` : ""}${intake.governingLaw ? ` under ${intake.governingLaw} law` : ""}. Understand exactly which roles and companies are restricted before you apply anywhere.`,
      urgency: "medium",
    });
  }

  if (items.length < 6) {
    items.push({
      id: "unemployment",
      title: "File for unemployment insurance as soon as you're eligible",
      description: `Benefits take 2–4 weeks to process. ${intake.severancePaymentType === "lump-sum" ? "Lump-sum severance typically doesn't delay eligibility in most states — you may be able to file now." : intake.severancePaymentType === "continued-payroll" ? "With salary continuation severance, most states require waiting until payments end before filing." : "Check your state's rules on when you can file given your severance structure."}`,
      urgency: "medium",
    });
  }

  const urgencyOrder: Record<Urgency, number> = { critical: 0, high: 1, medium: 2 };
  return items
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, 6);
}
