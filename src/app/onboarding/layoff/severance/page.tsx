"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake, LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import type { NegotiationAnswers, NegotiationContext } from "@/app/api/generate-negotiation-email/route";
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle2,
  Circle, Copy, Check, RotateCcw, ChevronDown,
} from "lucide-react";

/* ─── Types ─── */
type Step = "questions" | "generating" | "result";

/* ─── Helpers ─── */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

function daysUntilDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─── Insight assessment ─── */
function computeAssessment(answers: NegotiationAnswers, intake: LayoffIntakeApiResponse): { headline: string; body: string; recommendation: string } {
  const hasLeverage = answers.tenure === "5-10 years" || answers.tenure === "10+ years";
  const moderateLeverage = answers.tenure === "2-5 years";
  const shortTenure = answers.tenure === "<1 year" || answers.tenure === "1-2 years";
  const broadLayoff = answers.layoffType === "company-wide";
  const hrSaidFinal = answers.hrConversation === "said-final";
  const hrOpen = answers.hrConversation === "open";
  const deadline = intake.severanceSignDeadline ? daysUntilDate(intake.severanceSignDeadline) : null;
  const isUrgent = deadline !== null && deadline <= 7;

  if (hrOpen) {
    return {
      headline: "HR has indicated some openness — this is worth pursuing.",
      body: "When HR signals flexibility, even informally, a written request almost always makes sense. A well-framed email formalizes your ask in a way that's easy for them to review and respond to.",
      recommendation: "A professional, specific email is your strongest next step.",
    };
  }

  if (hrSaidFinal) {
    return {
      headline: "Even when HR says it's final, a written ask can still work.",
      body: `"The terms are final" is sometimes an opening position, especially in structured layoffs. Companies often have more discretion than the standard response implies. A respectful written request rarely damages the relationship and occasionally produces meaningful results.`,
      recommendation: "It's low risk to try — a calm, professional email won't hurt your standing.",
    };
  }

  if (hasLeverage && broadLayoff) {
    return {
      headline: "Your tenure and layoff context both work in your favor.",
      body: `${answers.tenure} of service is meaningful leverage. In company-wide layoffs, HR teams often have some discretion to accommodate reasonable requests from longer-tenured employees — especially for benefits extensions or additional weeks.`,
      recommendation: "You have a reasonable case. A specific, professional ask is likely worth making.",
    };
  }

  if (hasLeverage) {
    return {
      headline: `${answers.tenure} of service gives you meaningful leverage.`,
      body: "Longer tenures are the single strongest signal in severance negotiations. Companies tend to treat longer-term employees with more flexibility, both out of goodwill and to protect their employer reputation.",
      recommendation: "Your tenure gives you real standing to make a specific ask.",
    };
  }

  if (moderateLeverage && broadLayoff) {
    return {
      headline: "In a structured layoff, companies often have more flexibility than they indicate.",
      body: "Even with a few years of tenure, a well-framed, respectful request can surface discretionary flexibility that exists but isn't proactively offered. The worst outcome is a polite \"no\" — the best outcome could be meaningful.",
      recommendation: "Worth trying — a professional email costs you nothing.",
    };
  }

  if (shortTenure && broadLayoff) {
    return {
      headline: "Shorter tenures have less leverage, but a polite ask rarely hurts.",
      body: "With less time at the company, the case for additional severance weeks is harder to make. But asking about benefits extensions, references, or non-compete flexibility can still be productive — these cost the company less and are often easier to grant.",
      recommendation: "Focus your ask on benefits, references, or non-compete terms rather than additional weeks.",
    };
  }

  if (isUrgent) {
    return {
      headline: "Time is short — if you're going to ask, ask now.",
      body: `You have ${deadline} day${deadline !== 1 ? "s" : ""} before the deadline. That's still enough time for a brief, direct email. Keep it simple and specific — one or two asks, not a comprehensive renegotiation.`,
      recommendation: "Send a short, direct email today. Don't overthink it.",
    };
  }

  return {
    headline: "A respectful ask is almost always worth making.",
    body: "Even without exceptional leverage, many severance packages have some flexibility that isn't proactively offered. The professional relationship is mostly already concluded — a calm, specific written request rarely creates lasting damage, and sometimes produces real results.",
    recommendation: "Low risk, potential upside. A professional email is a reasonable next step.",
  };
}

/* ─── Main Page ─── */
export default function SeverancePage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [intake, setIntake] = useState<LayoffIntakeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("questions");

  const [answers, setAnswers] = useState<NegotiationAnswers>({
    tenure: "",
    layoffType: "",
    hrConversation: "",
    goals: [],
  });

  const [email, setEmail] = useState("");
  const [emailSource, setEmailSource] = useState<"ai" | "template">("template");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.replace("/login?next=/onboarding/layoff/severance");
      return;
    }
    fetchLayoffIntake().then((data) => {
      if (!data || data.status !== "completed") {
        router.replace("/onboarding");
        return;
      }
      if (data.severanceOffered !== "yes") {
        router.replace("/onboarding/layoff/summary");
        return;
      }
      setIntake(data);
      setLoading(false);
    }).catch(() => router.replace("/onboarding"));
  }, [sessionStatus, router]);

  function toggleGoal(goal: string) {
    setAnswers((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  }

  const answersComplete =
    answers.tenure !== "" &&
    answers.layoffType !== "" &&
    answers.hrConversation !== "" &&
    answers.goals.length > 0;

  async function handleGenerate() {
    if (!intake || !answersComplete) return;
    setGenerating(true);
    setGenerateError(null);
    setStep("generating");

    const context: NegotiationContext = {
      company: intake.employer,
      role: intake.jobTitle,
      severanceAmount: intake.severanceAmount,
      severancePaymentType: intake.severancePaymentType,
      severanceSignDeadline: intake.severanceSignDeadline,
      releaseRequired: intake.releaseRequired,
      nonCompete: intake.nonCompete,
      governingLaw: intake.governingLaw,
    };

    try {
      const res = await fetch("/api/generate-negotiation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, answers }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      setEmail(data.email || "");
      setEmailSource(data.source || "template");
      setStep("result");
    } catch (err) {
      setGenerateError("Something went wrong. Please try again.");
      setStep("questions");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function handleRegenerate() {
    setEmail("");
    setStep("questions");
  }

  if (loading || !intake) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading your severance details…</p>
        </div>
      </div>
    );
  }

  const deadline = daysUntilDate(intake.severanceSignDeadline);
  const assessment = step === "result" ? computeAssessment(answers, intake) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/onboarding/layoff/summary"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to summary
          </Link>
          <span className="text-blue-600 font-semibold text-sm">Transition</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 pb-24">
        {/* Intro */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Severance Review</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">
            Before you sign, it may be worth asking.
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Many severance packages have flexibility that isn't proactively offered. This walkthrough helps you assess your situation and, if it makes sense, draft a professional email to explore your options.
          </p>
        </div>

        {/* Situation snapshot */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your situation</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs block mb-0.5">Company</span>
              <span className="font-medium text-gray-900">{intake.employer || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block mb-0.5">Role</span>
              <span className="font-medium text-gray-900">{intake.jobTitle || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block mb-0.5">Severance offered</span>
              <span className="font-medium text-gray-900">
                {intake.severanceAmount || "Package offered"}
                {intake.severancePaymentType === "lump-sum" ? " · Lump sum" : intake.severancePaymentType === "continued-payroll" ? " · Continued payroll" : ""}
              </span>
            </div>
            {intake.severanceSignDeadline && (
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Sign deadline</span>
                <span className={`font-medium ${deadline !== null && deadline <= 7 ? "text-red-600" : deadline !== null && deadline <= 14 ? "text-amber-700" : "text-gray-900"}`}>
                  {formatDate(intake.severanceSignDeadline)}
                  {deadline !== null && deadline >= 0 && (
                    <span className="text-gray-400 font-normal ml-1">({deadline}d)</span>
                  )}
                </span>
              </div>
            )}
            {intake.releaseRequired === "yes" && (
              <div className="col-span-2">
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Release of claims required
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Questions ── */}
        {(step === "questions" || step === "generating") && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-5">
              A few quick questions
            </h2>

            <div className="flex flex-col gap-6">
              {/* Q1: Tenure */}
              <Question
                label="How long were you at the company?"
                required
              >
                <SelectOption
                  options={[
                    { value: "<1 year", label: "Less than a year" },
                    { value: "1-2 years", label: "1–2 years" },
                    { value: "2-5 years", label: "2–5 years" },
                    { value: "5-10 years", label: "5–10 years" },
                    { value: "10+ years", label: "10+ years" },
                  ]}
                  value={answers.tenure}
                  onChange={(v) => setAnswers({ ...answers, tenure: v })}
                />
              </Question>

              {/* Q2: Layoff type */}
              <Question
                label="Was this a company-wide layoff or more targeted?"
                required
              >
                <SelectOption
                  options={[
                    { value: "company-wide", label: "Part of a broader company or team layoff" },
                    { value: "targeted", label: "More of an individual or small-group separation" },
                    { value: "unsure", label: "I'm not entirely sure" },
                  ]}
                  value={answers.layoffType}
                  onChange={(v) => setAnswers({ ...answers, layoffType: v })}
                />
              </Question>

              {/* Q3: HR conversation */}
              <Question
                label="Have you spoken with HR about flexibility in the terms?"
                required
              >
                <SelectOption
                  options={[
                    { value: "not-yet", label: "Not yet" },
                    { value: "open", label: "Yes — they seemed open to discussion" },
                    { value: "said-final", label: "Yes — they said the terms are final" },
                  ]}
                  value={answers.hrConversation}
                  onChange={(v) => setAnswers({ ...answers, hrConversation: v })}
                />
              </Question>

              {/* Q4: Goals */}
              <Question
                label="What would be most valuable to you? Select all that apply."
                required
              >
                <div className="flex flex-col gap-2">
                  {[
                    { value: "additional-weeks", label: "Additional weeks of severance pay" },
                    { value: "extended-benefits", label: "Extended health insurance coverage" },
                    { value: "non-compete-removal", label: "Removal or narrowing of the non-compete", show: intake.nonCompete === "yes" || true },
                    { value: "positive-reference", label: "Confirmed positive reference or rehire-eligible status" },
                    { value: "other", label: "Other improvements to the terms" },
                  ].map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => toggleGoal(goal.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                        answers.goals.includes(goal.value)
                          ? "bg-blue-50 border-blue-300 text-blue-900"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {answers.goals.includes(goal.value)
                        ? <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                      {goal.label}
                    </button>
                  ))}
                </div>
              </Question>
            </div>

            {/* Note on legal advice */}
            <p className="text-xs text-gray-400 mt-6 leading-relaxed">
              This tool provides practical guidance to help you think through your options. It is not legal advice. For a substantial package or complex situation, consulting an employment attorney is recommended.
            </p>

            {/* CTA */}
            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={!answersComplete || generating}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-colors ${
                  answersComplete && !generating
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating email…
                  </>
                ) : (
                  <>
                    See my assessment and draft email
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {!answersComplete && (
                <p className="text-xs text-gray-400 text-center mt-2">Answer all questions to continue</p>
              )}
              {generateError && (
                <p className="text-xs text-red-500 text-center mt-2">{generateError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {step === "result" && assessment && (
          <div>
            {/* Assessment */}
            <div className="bg-white border border-blue-200 rounded-xl p-6 mb-6">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Our assessment</p>
              <h3 className="text-base font-semibold text-gray-900 mb-3 leading-snug">{assessment.headline}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{assessment.body}</p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-sm text-blue-800 font-medium">{assessment.recommendation}</p>
              </div>
            </div>

            {/* Deadline reminder */}
            {intake.severanceSignDeadline && deadline !== null && deadline >= 0 && (
              <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 mb-6 ${deadline <= 7 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${deadline <= 7 ? "text-red-500" : "text-amber-500"}`} />
                <p className={`text-sm font-medium ${deadline <= 7 ? "text-red-700" : "text-amber-700"}`}>
                  {deadline === 0
                    ? "Your sign deadline is today."
                    : `You have ${deadline} day${deadline !== 1 ? "s" : ""} before the sign deadline on ${formatDate(intake.severanceSignDeadline)}.`}{" "}
                  Send any email today or tomorrow to allow time for a response.
                </p>
              </div>
            )}

            {/* Generated email */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Draft negotiation email</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {emailSource === "ai" ? "Generated by AI — review and personalize before sending" : "Professional template — fill in your name and HR contact"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Redo
                  </button>
                </div>
              </div>
              <textarea
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-5 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none"
                style={{ minHeight: "28rem" }}
                spellCheck
              />
            </div>

            {/* Sending guidance */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Before you send</p>
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                {[
                  "Replace all [brackets] with your actual name and HR contact",
                  "Read it aloud once — if anything sounds off, edit it",
                  "Keep the tone professional and grateful, not transactional",
                  "Send to your direct HR contact or the person who delivered the news",
                  "If you don't hear back in 2–3 business days, a brief follow-up is reasonable",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/onboarding/layoff/tasks"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
              >
                Back to action plan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/onboarding/layoff/summary"
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3.5 px-5 rounded-xl border border-gray-200 transition-colors text-sm"
              >
                Back to summary
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function Question({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-2.5">
        {label}
        {required && <span className="text-blue-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectOption({
  options, value, onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-sm px-4 py-3 border rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
          value ? "text-gray-900 border-gray-300 bg-white" : "text-gray-400 border-gray-200 bg-white"
        }`}
      >
        <option value="">Select an option…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
