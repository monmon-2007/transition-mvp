/* ─────────────────────────────────────────────────────────────
   Job Search Quality Engine
   Pure function — no side effects, no API calls.
   Runs on the client from available application + contact + resume data.
───────────────────────────────────────────────────────────── */

export type InsightType = "warning" | "info" | "positive";
export type InsightSeverity = "high" | "medium" | "low";

export type InsightAction = {
  label: string;
  action: string;
};

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  recommendation?: string;
  severity: InsightSeverity;
  actions?: InsightAction[];
};

type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied?: string;
  resumeId?: number;
  tailored?: boolean;
};

type Contact = { id: string };

type Resume = {
  id: string;
  name: string;
  targetRole: string;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const INTERVIEW_OR_BEYOND = new Set(["interviewing", "offer"]);

/* ── Role category grouping ─────────────────────────────────
   Simple keyword grouping — no NLP, no external deps.
────────────────────────────────────────────────────────────── */
const ROLE_CATEGORIES: [string, string[]][] = [
  ["engineering", ["engineer", "developer", "dev", "swe", "backend", "frontend", "fullstack", "software"]],
  ["product", ["product manager", "pm ", " pm", "product lead", "product director"]],
  ["design", ["designer", "ux", "ui ", " ui", "product design"]],
  ["data", ["data scientist", "data analyst", "data engineer", "ml ", "machine learning", "analyst"]],
  ["marketing", ["marketing", "growth", "seo", "content", "brand"]],
  ["sales", ["sales", "account executive", "ae ", "business development", "bdr", "sdr"]],
  ["operations", ["operations", "ops ", " ops", "chief of staff", "program manager", "project manager"]],
  ["finance", ["finance", "accounting", "controller", "cfo", "financial"]],
  ["management", ["manager", "director", "vp ", " vp", "head of", "lead"]],
];

export function getRoleCategory(role: string): string {
  const lower = role.toLowerCase();
  for (const [category, keywords] of ROLE_CATEGORIES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

/* ── Resume–role keyword overlap check ──────────────────────
   Returns true if targetRole and application role seem mismatched.
────────────────────────────────────────────────────────────── */
function isRoleMismatch(resumeTargetRole: string, applicationRole: string): boolean {
  const resumeCategory = getRoleCategory(resumeTargetRole);
  const appCategory = getRoleCategory(applicationRole);
  if (resumeCategory === "other" || appCategory === "other") return false;
  if (resumeCategory === "management" || appCategory === "management") return false; // too ambiguous
  return resumeCategory !== appCategory;
}

/* ── Main export ────────────────────────────────────────────── */
export function computeJobSearchInsights({
  applications,
  contacts,
  resumes,
}: {
  applications: Application[];
  contacts: Contact[];
  resumes: Resume[];
}): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();

  // Build resume lookup by id (string)
  const resumeById = new Map<string, Resume>();
  resumes.forEach((r) => resumeById.set(r.id, r));

  // Only look at non-terminal applications
  const activeApps = applications.filter(
    (a) => a.status !== "rejected" && a.status !== "withdrawn"
  );

  // Apps submitted in last 7 days
  const recentApps = activeApps.filter((a) => {
    if (!a.dateApplied) return false;
    return now - new Date(a.dateApplied).getTime() <= SEVEN_DAYS_MS;
  });

  /* ── 1. Spray & Pray (HIGH) ────────────────────────────── */
  const hasInterview = activeApps.some((a) => INTERVIEW_OR_BEYOND.has(a.status));
  if (recentApps.length > 15 && !hasInterview) {
    insights.push({
      id: "spray-and-pray",
      type: "warning",
      severity: "high",
      title: "Your application pace may be limiting your results",
      description: `${recentApps.length} applications in the last 7 days with no interviews yet suggests volume over targeting.`,
      recommendation:
        "Slow down. Tailor each application to the specific role and use your network for warm introductions to key companies.",
      actions: [
        { label: "Tailor a resume for your next role", action: "tailor_resume" },
        { label: "Focus your target roles", action: "define_roles" },
      ],
    });
  }

  /* ── 2. Role inconsistency (MEDIUM) ───────────────────── */
  if (activeApps.length >= 5) {
    const categories = new Set(activeApps.map((a) => getRoleCategory(a.role)));
    categories.delete("other");
    if (categories.size > 2) {
      insights.push({
        id: "role-inconsistency",
        type: "warning",
        severity: "medium",
        title: "Your applications span very different role types",
        description: `You're applying to ${categories.size} distinct categories of roles. Recruiters want to see a focused, consistent narrative.`,
        recommendation:
          "Pick 1–2 role types to pursue and build a targeted resume for each. Focused searches produce faster results.",
      });
    }
  }

  /* ── 3. Duplicate applications (LOW) ──────────────────── */
  const companyCounts = new Map<string, number>();
  applications.forEach((a) => {
    const key = a.company.toLowerCase().trim();
    companyCounts.set(key, (companyCounts.get(key) ?? 0) + 1);
  });
  const duplicateCompanies = [...companyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([company]) => company);

  if (duplicateCompanies.length > 0) {
    const label =
      duplicateCompanies.length === 1
        ? `${duplicateCompanies[0]}`
        : `${duplicateCompanies[0]} and ${duplicateCompanies.length - 1} other${duplicateCompanies.length > 2 ? "s" : ""}`;
    insights.push({
      id: "duplicate-applications",
      type: "warning",
      severity: "low",
      title: "You've applied to the same company more than once",
      description: `${label} appears in your applications more than once.`,
      recommendation:
        "Review which role is the stronger fit and focus your energy there. Multiple applications to one company can look unfocused to recruiters.",
    });
  }

  /* ── 4. No networking (MEDIUM) ────────────────────────── */
  if (activeApps.length > 15 && contacts.length === 0) {
    insights.push({
      id: "no-networking",
      type: "warning",
      severity: "medium",
      title: "High application volume with no network activity",
      description:
        "Warm introductions convert to interviews at 3–5× the rate of cold applications.",
      recommendation:
        "Add your top 5–10 contacts to the Network tab. Even one warm intro per week meaningfully improves your pipeline.",
      actions: [
        { label: "Add your first contact", action: "add_contact" },
      ],
    });
  }

  /* ── 5. Stale applications (LOW) ──────────────────────── */
  const staleApps = applications.filter((a) => {
    if (a.status !== "applied") return false;
    if (!a.dateApplied) return false;
    return now - new Date(a.dateApplied).getTime() > FOURTEEN_DAYS_MS;
  });

  if (staleApps.length > 0) {
    insights.push({
      id: "stale-applications",
      type: "info",
      severity: "low",
      title: `${staleApps.length} application${staleApps.length > 1 ? "s" : ""} haven't moved in over 2 weeks`,
      description:
        "Applications sitting at 'Applied' for more than 14 days rarely convert on their own.",
      recommendation:
        "Send a brief follow-up to the recruiter, or mark these as rejected to keep your pipeline accurate.",
      actions: [
        { label: "Follow up on stale applications", action: "follow_up" },
      ],
    });
  }

  /* ── 6. No tailoring (MEDIUM) ─────────────────────────── */
  if (activeApps.length > 10) {
    const anyTailored = activeApps.some((a) => a.tailored === true);
    if (!anyTailored) {
      insights.push({
        id: "no-tailoring",
        type: "warning",
        severity: "medium",
        title: "None of your applications used a tailored resume",
        description:
          "Generic resumes get significantly lower response rates than ones tailored to the specific role and company.",
        recommendation:
          'Try the "Tailor for this job" feature on your next 3 applications — it takes under a minute.',
        actions: [
          { label: "Tailor a resume for a job", action: "tailor_resume" },
        ],
      });
    }
  }

  /* ── 7. Resume reuse (LOW) ─────────────────────────────── */
  const appsWithResumeId = activeApps.filter((a) => a.resumeId != null);
  if (appsWithResumeId.length >= 5) {
    const resumeIdCounts = new Map<number, number>();
    appsWithResumeId.forEach((a) => {
      const rid = a.resumeId!;
      resumeIdCounts.set(rid, (resumeIdCounts.get(rid) ?? 0) + 1);
    });
    const [topId, topCount] = [...resumeIdCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const pct = topCount / appsWithResumeId.length;
    if (pct > 0.7) {
      const topResume = resumeById.get(String(topId));
      insights.push({
        id: "resume-reuse",
        type: "info",
        severity: "low",
        title: "You're using the same resume for most applications",
        description: `"${topResume?.name ?? "One resume"}" is attached to ${Math.round(pct * 100)}% of your applications.`,
        recommendation:
          "Create 2–3 targeted versions for different role types. Even small adjustments to keywords can improve match rates.",
      });
    }
  }

  /* ── 8. Resume–role mismatch (LOW) ────────────────────── */
  const mismatchedRoles: string[] = [];
  appsWithResumeId.forEach((a) => {
    const resume = resumeById.get(String(a.resumeId!));
    if (!resume) return;
    if (isRoleMismatch(resume.targetRole, a.role)) {
      mismatchedRoles.push(a.role);
    }
  });
  if (mismatchedRoles.length > 0) {
    const sample = [...new Set(mismatchedRoles)].slice(0, 2).join(", ");
    insights.push({
      id: "resume-role-mismatch",
      type: "warning",
      severity: "low",
      title: "Some applications may not match your resume's positioning",
      description: `Roles like "${sample}" may not align with your resume's current positioning.`,
      recommendation:
        'Use "Tailor for this job" to create a targeted version for these roles.',
    });
  }

  // Sort: high → medium → low
  const SEVERITY_ORDER: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return insights;
}

/* ── Per-application inline warnings ──────────────────────── */
export function getApplicationWarnings(
  app: Application,
  allApplications: Application[],
  resumes: Resume[]
): string[] {
  const warnings: string[] = [];

  // Duplicate company
  const dupeCount = allApplications.filter(
    (a) => a.company.toLowerCase().trim() === app.company.toLowerCase().trim()
  ).length;
  if (dupeCount > 1) {
    warnings.push("You've applied here before");
  }

  // Resume–role mismatch
  if (app.resumeId != null) {
    const resume = resumes.find((r) => r.id === String(app.resumeId));
    if (resume && isRoleMismatch(resume.targetRole, app.role)) {
      warnings.push("Resume positioning may not match this role type");
    }
  }

  return warnings;
}

/* ── Next Best Action ──────────────────────────────────────── */
export type NextBestAction = {
  title: string;
  description: string;
  action?: {
    label: string;
    type: string;
  };
};

type TaskInput = {
  id: string;
  title: string;
  explanation: string;
  status: string;
  priority?: string;
  phase?: string;
};

export function getNextBestAction({
  insights,
  tasks,
}: {
  insights: Insight[];
  tasks: TaskInput[];
}): NextBestAction | null {
  // 1. High-severity insight with an action
  const highWithAction = insights.find((i) => i.severity === "high" && i.actions && i.actions.length > 0);
  if (highWithAction) {
    return {
      title: highWithAction.title,
      description: highWithAction.recommendation ?? highWithAction.description,
      action: {
        label: highWithAction.actions![0].label,
        type: highWithAction.actions![0].action,
      },
    };
  }

  const incomplete = tasks.filter((t) => t.status !== "Done" && t.status !== "Skipped");

  // 2. First incomplete task in "Act Now" phase
  const actNow = incomplete.find((t) => t.phase === "act-now");
  if (actNow) {
    return {
      title: actNow.title,
      description: actNow.explanation,
    };
  }

  // 3. First high-priority incomplete task
  const highPriority = incomplete.find((t) => t.priority === "high");
  if (highPriority) {
    return {
      title: highPriority.title,
      description: highPriority.explanation,
    };
  }

  return null;
}
