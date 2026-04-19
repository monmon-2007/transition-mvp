"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake, LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import {
  AlertTriangle, Clock, Shield, ChevronDown, ChevronUp,
  ArrowRight, HelpCircle, Briefcase, DollarSign,
  Heart, TrendingUp, Scale, Globe, Pencil, Lightbulb,
} from "lucide-react";

/* ─── Types ─── */
type Urgency = "critical" | "high" | "medium";

type AttentionItem = {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  deadline?: string;
  daysUntil?: number;
};

type MissingItem = {
  field: string;
  label: string;
  impact: string;
};

/* ─── Utilities ─── */
function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function displayValue(val: string | null | undefined): string {
  if (!val) return "";
  if (val === "yes") return "Yes";
  if (val === "no") return "No";
  if (val === "unsure") return "Unclear";
  if (val === "lump-sum") return "Lump sum";
  if (val === "continued-payroll") return "Continued payroll";
  if (val === "rsu") return "RSUs";
  if (val === "options") return "Stock options";
  return val;
}

/* ─── Attention items ─── */
function buildAttentionItems(intake: LayoffIntakeApiResponse): AttentionItem[] {
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

/* ─── Missing items ─── */
/* ─── Negotiation insight detection ─── */
function shouldShowNegotiationInsight(intake: LayoffIntakeApiResponse): boolean {
  if (intake.severanceOffered !== "yes") return false;
  // If deadline is past, too late to act
  if (intake.severanceSignDeadline) {
    const days = daysUntilDate(intake.severanceSignDeadline);
    if (days !== null && days < 0) return false;
    // Still show if 1+ day remains
  }
  return true;
}

function buildMissingItems(intake: LayoffIntakeApiResponse): MissingItem[] {
  const missing: MissingItem[] = [];

  if (!intake.terminationDate) {
    missing.push({ field: "terminationDate", label: "Exact termination date", impact: "Needed to calculate unemployment eligibility and other deadlines" });
  }
  if (!intake.severanceOffered || intake.severanceOffered === "unsure") {
    missing.push({ field: "severanceOffered", label: "Severance status confirmed", impact: "Critical for understanding financial runway and legal obligations" });
  }
  if (intake.severanceOffered === "yes" && !intake.severanceAmount) {
    missing.push({ field: "severanceAmount", label: "Severance amount", impact: "Needed to evaluate whether the offer is appropriate for your tenure" });
  }
  if (!intake.healthEndDate && intake.healthActive === "yes") {
    missing.push({ field: "healthEndDate", label: "Health insurance end date", impact: "Needed to plan COBRA or ACA enrollment timing accurately" });
  }
  if (intake.equityType === "options" && !intake.exerciseDeadline) {
    missing.push({ field: "exerciseDeadline", label: "Stock option exercise deadline", impact: "This is a hard deadline — options expire and cannot be recovered" });
  }
  if (!intake.ptoPayoutExpected || intake.ptoPayoutExpected === "unsure") {
    missing.push({ field: "ptoPayoutExpected", label: "PTO payout status", impact: "Could be meaningful additional compensation owed to you" });
  }

  return missing;
}

/* ─── Page ─── */
export default function SituationSummaryPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [intake, setIntake] = useState<LayoffIntakeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["employment", "severance", "benefits"])
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.replace("/login?next=/onboarding/layoff/summary");
      return;
    }
    fetchLayoffIntake()
      .then((data) => {
        if (!data || data.status !== "completed") {
          router.replace("/onboarding");
          return;
        }
        setIntake(data);
        setLoading(false);
      })
      .catch(() => router.replace("/onboarding"));
  }, [sessionStatus, router]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading || !intake) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Reviewing your situation…</p>
        </div>
      </div>
    );
  }

  const attentionItems = buildAttentionItems(intake);
  const missingItems = buildMissingItems(intake);
  const showNegotiationInsight = shouldShowNegotiationInsight(intake);
  const company = intake.employer || "your employer";
  const role = intake.jobTitle || "your role";

  const urgencyConfig: Record<Urgency, { card: string; badge: string; icon: React.ReactNode }> = {
    critical: {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700 border border-red-200",
      icon: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
    },
    high: {
      card: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: <Clock className="w-4 h-4 text-amber-500 shrink-0" />,
    },
    medium: {
      card: "bg-slate-50 border-slate-200",
      badge: "bg-slate-100 text-slate-600 border border-slate-200",
      icon: <Shield className="w-4 h-4 text-slate-400 shrink-0" />,
    },
  };

  const urgencyLabel: Record<Urgency, string> = {
    critical: "Act now",
    high: "High priority",
    medium: "Important",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-blue-600 font-semibold text-base">Transition</span>
          <Link
            href="/onboarding/layoff/tasks"
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            Skip to action plan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 pb-28">
        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Situation Review
          </p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
            Here's what we understand about your situation.
          </h1>
          <p className="text-gray-500 text-base mb-3">
            Review this carefully. If anything is missing or incorrect, edit your details before continuing to your action plan.
          </p>
          <p className="text-xs text-gray-400">
            Your plan is based on this information — you can edit it anytime by returning to this page.
          </p>
        </div>

        {/* Snapshot */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
            <SnapshotRow label="Employer" value={company} />
            <SnapshotRow label="Role" value={role} />
            {intake.terminationDate && (
              <SnapshotRow label="Termination date" value={formatDate(intake.terminationDate)} />
            )}
            <SnapshotRow
              label="Severance"
              value={
                intake.severanceOffered === "yes"
                  ? [
                      intake.severanceAmount,
                      intake.severancePaymentType === "lump-sum"
                        ? "Lump sum"
                        : intake.severancePaymentType === "continued-payroll"
                        ? "Continued payroll"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Offered"
                  : intake.severanceOffered === "no"
                  ? "None offered"
                  : "Unclear"
              }
            />
            <SnapshotRow
              label="Health coverage"
              value={
                intake.healthActive === "yes"
                  ? intake.healthEndDate
                    ? `Active — ends ${formatDate(intake.healthEndDate)}`
                    : "Active (end date unknown)"
                  : intake.healthActive === "no"
                  ? "No longer active"
                  : "Unclear"
              }
            />
            <SnapshotRow
              label="Search urgency"
              value={
                intake.desiredUrgency === "asap"
                  ? "High — need to move quickly"
                  : intake.desiredUrgency === "normal"
                  ? "Standard pace"
                  : intake.desiredUrgency === "taking_time"
                  ? "Taking some time"
                  : "Not specified"
              }
            />
          </div>
        </div>

        {/* Needs Attention */}
        {(attentionItems.length > 0 || showNegotiationInsight) && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-gray-900 mb-4">What needs your attention</h2>
            <div className="flex flex-col gap-3">
              {attentionItems.map((item) => {
                const cfg = urgencyConfig[item.urgency];
                return (
                  <div key={item.id} className={`rounded-xl border p-5 ${cfg.card}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-gray-900 leading-snug">
                            {item.title}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {urgencyLabel[item.urgency]}
                          </span>
                          {item.daysUntil !== undefined && item.daysUntil >= 0 && (
                            <span className="text-xs text-gray-400">
                              {item.daysUntil === 0 ? "Due today" : `${item.daysUntil}d remaining`}
                            </span>
                          )}
                          {item.daysUntil !== undefined && item.daysUntil < 0 && (
                            <span className="text-xs text-red-500 font-medium">Overdue</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Severance negotiation insight */}
              {showNegotiationInsight && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 leading-snug">
                          You may be able to negotiate your severance
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Opportunity
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        Many severance packages have flexibility that isn&apos;t proactively offered — additional weeks, extended benefits, or non-compete adjustments.{" "}
                        {intake.severanceAmount && `Your current package is ${intake.severanceAmount}. `}
                        {intake.severanceSignDeadline
                          ? `You have until ${intake.severanceSignDeadline} to sign — there's still time to explore this.`
                          : "Before you sign, it may be worth a conversation."}
                      </p>
                      <Link
                        href="/onboarding/layoff/severance"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                      >
                        Explore your options
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Full Breakdown */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Your situation, in full</h2>
          <div className="flex flex-col gap-2">
            <BreakdownSection
              id="employment"
              title="Employment & Separation"
              icon={<Briefcase className="w-4 h-4" />}
              expanded={expanded.has("employment")}
              onToggle={() => toggle("employment")}
            >
              <DataRow label="Employer" value={intake.employer} />
              <DataRow label="Job title" value={intake.jobTitle} />
              <DataRow label="Employment type" value={intake.employmentType} />
              <DataRow label="Location" value={intake.location} />
              <DataRow label="Last working day" value={formatDate(intake.lastWorkingDay)} />
              <DataRow label="Termination date" value={formatDate(intake.terminationDate)} />
              <DataRow label="Separation type" value={intake.separationType} />
              <DataRow label="Rehire eligible" value={displayValue(intake.rehireEligible)} />
            </BreakdownSection>

            {intake.severanceOffered && intake.severanceOffered !== "no" && (
              <BreakdownSection
                id="severance"
                title="Severance & Compensation"
                icon={<DollarSign className="w-4 h-4" />}
                expanded={expanded.has("severance")}
                onToggle={() => toggle("severance")}
              >
                <DataRow label="Severance offered" value={displayValue(intake.severanceOffered)} />
                <DataRow label="Amount" value={intake.severanceAmount} />
                <DataRow label="Payment type" value={displayValue(intake.severancePaymentType)} />
                <DataRow label="Duration" value={intake.severanceDuration} />
                <DataRow label="Sign deadline" value={formatDate(intake.severanceSignDeadline)} highlight={!!intake.severanceSignDeadline} />
                <DataRow label="Release of claims" value={displayValue(intake.releaseRequired)} />
                <DataRow label="Final paycheck received" value={displayValue(intake.finalPaycheckReceived)} />
                <DataRow label="PTO payout expected" value={displayValue(intake.ptoPayoutExpected)} />
                <DataRow label="Bonus owed" value={displayValue(intake.bonusOwed)} />
                <DataRow label="Commission owed" value={displayValue(intake.commissionOwed)} />
                <DataRow label="Pro-rated bonus" value={displayValue(intake.proRatedBonus)} />
                {intake.proRatedBonusAmount && (
                  <DataRow label="Pro-rated bonus amount" value={intake.proRatedBonusAmount} />
                )}
              </BreakdownSection>
            )}

            <BreakdownSection
              id="benefits"
              title="Benefits & Insurance"
              icon={<Heart className="w-4 h-4" />}
              expanded={expanded.has("benefits")}
              onToggle={() => toggle("benefits")}
            >
              <DataRow label="Health insurance active" value={displayValue(intake.healthActive)} />
              <DataRow label="Coverage end date" value={formatDate(intake.healthEndDate)} highlight={!!intake.healthEndDate} />
              <DataRow label="COBRA mentioned" value={displayValue(intake.cobraMentioned)} />
              {intake.cobraContributionDetails && (
                <DataRow label="COBRA details" value={intake.cobraContributionDetails} />
              )}
              <DataRow label="HSA / FSA" value={displayValue(intake.hsaFsa)} />
              <DataRow label="Commuter benefits" value={displayValue(intake.commuterBenefits)} />
            </BreakdownSection>

            {intake.equityType && !["none", "unsure"].includes(intake.equityType) && (
              <BreakdownSection
                id="equity"
                title="Equity"
                icon={<TrendingUp className="w-4 h-4" />}
                expanded={expanded.has("equity")}
                onToggle={() => toggle("equity")}
              >
                <DataRow label="Equity type" value={displayValue(intake.equityType)} />
                <DataRow label="Unvested equity" value={displayValue(intake.unvestedEquity)} />
                <DataRow label="Last vesting date" value={formatDate(intake.lastVestingDate)} />
                <DataRow label="Exercise deadline" value={formatDate(intake.exerciseDeadline)} highlight={!!intake.exerciseDeadline} />
              </BreakdownSection>
            )}

            {(intake.nonCompete === "yes" || intake.nonSolicit === "yes" || intake.nonDisparagement === "yes" || intake.confidentialityObligation === "yes" || intake.returnEquipmentDeadline) && (
              <BreakdownSection
                id="legal"
                title="Legal Obligations"
                icon={<Scale className="w-4 h-4" />}
                expanded={expanded.has("legal")}
                onToggle={() => toggle("legal")}
              >
                <DataRow label="Non-compete" value={displayValue(intake.nonCompete)} />
                {intake.nonCompete === "yes" && intake.nonCompeteDuration && (
                  <DataRow label="Non-compete duration" value={intake.nonCompeteDuration} />
                )}
                <DataRow label="Non-solicit" value={displayValue(intake.nonSolicit)} />
                <DataRow label="Non-disparagement" value={displayValue(intake.nonDisparagement)} />
                <DataRow label="Confidentiality obligation" value={displayValue(intake.confidentialityObligation)} />
                <DataRow label="Governing law" value={intake.governingLaw} />
                {intake.returnEquipmentDeadline && (
                  <DataRow label="Equipment return deadline" value={formatDate(intake.returnEquipmentDeadline)} highlight />
                )}
              </BreakdownSection>
            )}

            {intake.tiedToVisa === "yes" && (
              <BreakdownSection
                id="visa"
                title="Visa & Work Authorization"
                icon={<Globe className="w-4 h-4" />}
                expanded={expanded.has("visa")}
                onToggle={() => toggle("visa")}
                urgent
              >
                <DataRow label="Tied to visa" value="Yes" />
                <DataRow label="Visa type" value={intake.visaType} />
                {intake.visaDeadlines && (
                  <DataRow label="Known deadlines" value={intake.visaDeadlines} highlight />
                )}
              </BreakdownSection>
            )}
          </div>
        </section>

        {/* Missing info */}
        {missingItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Missing or unclear information
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              These items weren&apos;t captured. Editing your details to fill them in will improve the accuracy of your action plan.
            </p>
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {missingItems.map((item) => (
                <div key={item.field} className="flex items-start gap-3 px-5 py-4">
                  <HelpCircle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-400 ml-2">— {item.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/onboarding/layoff/tasks"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
          >
            Continue to my action plan
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/onboarding/layoff"
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3.5 px-5 rounded-xl border border-gray-200 transition-colors text-sm"
          >
            <Pencil className="w-4 h-4" />
            Edit my details
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs block mb-0.5">{label}</span>
      <span className="font-medium text-gray-900 text-sm">{value || "—"}</span>
    </div>
  );
}

function BreakdownSection({
  id, title, icon, expanded, onToggle, children, urgent = false,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  urgent?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${urgent ? "border-red-200" : "border-gray-200"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={urgent ? "text-red-400" : "text-gray-400"}>{icon}</span>
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {urgent && (
            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">
              Review now
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-6 text-sm">
      <span className="text-gray-400 w-44 shrink-0">{label}</span>
      <span className={`font-medium ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
