import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { computeRunway } from "@/lib/runway";
import { backendFetch } from "@/lib/backendClient";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/* ─────────────────────────────────────────
   Rate limiter — 10 requests per user per minute (in-memory)
───────────────────────────────────────── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count += 1;
  return true;
}

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
export type TailorRequest = {
  resumeContent: string;
  resumeName: string;
  jobDescription: string;
};

export type TailorResult = {
  tailoredContent: string;
  whatChanged: string[];
  suggestions: string[];
  savedResume: {
    id: number;
    name: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

/* ─────────────────────────────────────────
   Prompt builder
───────────────────────────────────────── */
function buildTailorPrompt(
  resumeContent: string,
  jobDescription: string,
  context: {
    role: string;
    company: string;
    level: string;
    runwayMonths: number | null;
    runwayRiskLevel: "high" | "medium" | "stable" | null;
  }
): string {
  const { role, company, level, runwayMonths, runwayRiskLevel } = context;

  const runwayLabel =
    runwayMonths !== null
      ? `${runwayMonths.toFixed(1)} months of financial runway`
      : "unknown financial runway";

  const optimizationDirective =
    runwayRiskLevel === "high"
      ? "Maximize ATS keyword match and broad appeal. Every word should increase match probability. The user needs interviews quickly."
      : runwayRiskLevel === "stable"
      ? "Optimize for differentiation and strategic narrative. Position for senior influence and long-term impact, not just execution."
      : "Balance strong keyword alignment with clear positioning. Show both execution ability and strategic capability.";

  const toneDirective =
    runwayRiskLevel === "high"
      ? "Emphasize proven, quantified impact. Be concrete. Avoid aspirational language. Mirror the exact terms used in the job description wherever they appear in the original resume."
      : runwayRiskLevel === "stable"
      ? "Lead with leadership scope, strategic impact, and business outcomes. Differentiate clearly from a standard execution-focused resume. Use confident, senior language."
      : "Mix concrete achievements with forward-looking positioning. Use the job description's language while maintaining a strong individual voice.";

  return `You are an expert resume writer helping a job seeker maximize their interview callback rate.

USER CONTEXT:
- Previous role: ${role} at ${company}
- Career level: ${level}
- Financial runway: ${runwayLabel}${runwayRiskLevel ? ` (${runwayRiskLevel} risk)` : ""}

OPTIMIZATION PRIORITY: ${optimizationDirective}

ORIGINAL RESUME:
${resumeContent}

TARGET JOB DESCRIPTION:
${jobDescription}

TASK: Rewrite this resume to maximize the callback rate for this specific role.

RULES (strictly enforce):
- Use ONLY experience and skills present in the original resume — never fabricate credentials, companies, or roles
- Mirror keywords from the job description naturally — do not stuff them
- Strengthen vague or weak bullets with stronger action verbs and implied metrics where the original content supports it
- Reorder sections or bullets to lead with what the job values most
- ${toneDirective}
- Keep the resume concise — do not add sections that don't exist in the original

Return ONLY valid JSON with this exact structure (no markdown, no commentary):
{
  "tailoredContent": "the full rewritten resume as clean plain text with clear section headers",
  "whatChanged": [
    "Rewrote summary to emphasize [specific thing] because the role requires [specific JD language]",
    "Added keyword '[keyword]' which appears prominently in the job requirements",
    "Strengthened [role/section] bullet from vague description to impact-focused statement",
    "Reordered skills to lead with [skill] which is listed first in the JD requirements"
  ],
  "suggestions": [
    "Consider adding [specific experience or credential] if you have it — the JD emphasizes it heavily",
    "This role values [specific thing] — a brief section on [X] could increase your match score"
  ]
}

The whatChanged array must have 3–6 specific, concrete entries. The suggestions array should have 0–3 entries (omit if nothing meaningful to add).`;
}


/* ─────────────────────────────────────────
   Route handler
───────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TailorRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { resumeContent, resumeName, jobDescription } = body;
  if (!resumeContent?.trim() || !jobDescription?.trim()) {
    return NextResponse.json({ error: "resumeContent and jobDescription are required" }, { status: 400 });
  }

  // Input length limits
  if (resumeContent.length > 20_000) {
    return NextResponse.json({ error: "Resume content exceeds maximum length" }, { status: 400 });
  }
  if (jobDescription.length > 10_000) {
    return NextResponse.json({ error: "Job description exceeds maximum length" }, { status: 400 });
  }

  // Rate limit
  if (!checkRateLimit(userId)) {
    console.warn(`Rate limit exceeded for user ${userId} on tailor endpoint`);
    return NextResponse.json(
      { error: "Too many requests — please wait a minute before trying again" },
      { status: 429 }
    );
  }

  // Fetch intake for user context
  let intakeContext = {
    role: "professional",
    company: "your company",
    level: "mid-level",
    runwayMonths: null as number | null,
    runwayRiskLevel: null as "high" | "medium" | "stable" | null,
  };

  try {
    const intakeRes = await backendFetch("/api/layoff-intake", {
      headers: { "X-User-Id": userId },
    });
    if (intakeRes.ok) {
      const intake = await intakeRes.json();
      intakeContext.role = intake.jobTitle || "professional";
      intakeContext.company = intake.employer || "your company";

      if (intake.monthlyExpenses && intake.monthlyExpenses > 0) {
        const runway = computeRunway(intake, intake.monthlyExpenses);
        if (runway) {
          intakeContext.runwayMonths = runway.runwayMonths;
          intakeContext.runwayRiskLevel = runway.riskLevel;
          intakeContext.level =
            runway.riskLevel === "high"
              ? "actively searching"
              : runway.riskLevel === "stable"
              ? "selectively searching"
              : "actively searching";
        }
      }
    }
  } catch {
    // Non-fatal — proceed with default context
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const versionName = `${resumeName} — Tailored`;

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not configured");
    return NextResponse.json(
      { error: "AI service is not available — please try again later" },
      { status: 503 }
    );
  }

  // Call Claude
  let tailorResult: { tailoredContent: string; whatChanged: string[]; suggestions: string[] };
  try {
    const prompt = buildTailorPrompt(resumeContent, jobDescription, intakeContext);

    const aiRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system:
          "You are an expert resume writer. Return only valid JSON with no markdown fences. Never fabricate experience. Mirror job description language precisely.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Anthropic API error:", aiRes.status, errText);
      return NextResponse.json(
        { error: "AI service is unavailable — please try again later" },
        { status: 503 }
      );
    }

    const aiData = await aiRes.json();
    const rawText = aiData.content?.[0]?.text?.trim() || "";

    // Strip markdown fences if model returned them despite instructions
    const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    tailorResult = JSON.parse(jsonText);
  } catch (err) {
    console.error("Tailor generation error:", err);
    return NextResponse.json(
      { error: "AI service is unavailable — please try again later" },
      { status: 503 }
    );
  }

  // Save tailored resume as a new backend record
  let savedResume: TailorResult["savedResume"] = null;
  try {
    const saveRes = await backendFetch("/api/resumes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify({
        name: versionName,
        targetRole: intakeContext.role,
        content: tailorResult.tailoredContent,
        status: "draft",
      }),
    });
    if (saveRes.ok) {
      const saved = await saveRes.json();
      savedResume = {
        id: saved.id,
        name: saved.name,
        status: saved.status,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    }
  } catch (err) {
    console.error("Failed to save tailored resume to backend:", err);
    // Non-fatal — client can still use the content
  }

  return NextResponse.json({
    tailoredContent: tailorResult.tailoredContent,
    whatChanged: tailorResult.whatChanged || [],
    suggestions: tailorResult.suggestions || [],
    savedResume,
  } satisfies TailorResult);
}
