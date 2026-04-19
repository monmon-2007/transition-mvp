import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/* ─── Types ─── */
export type NegotiationContext = {
  company: string | null;
  role: string | null;
  severanceAmount: string | null;
  severancePaymentType: string | null;
  severanceSignDeadline: string | null;
  releaseRequired: string | null;
  nonCompete: string | null;
  governingLaw: string | null;
};

export type NegotiationAnswers = {
  tenure: string;          // "<1 year" | "1-2 years" | "2-5 years" | "5-10 years" | "10+ years"
  layoffType: string;      // "company-wide" | "targeted" | "unsure"
  hrConversation: string;  // "not-yet" | "open" | "said-final"
  goals: string[];         // ["additional-weeks", "extended-benefits", "non-compete-removal", "positive-reference", "other"]
};

/* ─── Prompt builder ─── */
function buildPrompt(ctx: NegotiationContext, answers: NegotiationAnswers): string {
  const company = ctx.company || "the company";
  const role = ctx.role || "my role";
  const tenureMap: Record<string, string> = {
    "<1 year": "less than a year",
    "1-2 years": "one to two years",
    "2-5 years": "two to five years",
    "5-10 years": "five to ten years",
    "10+ years": "over ten years",
  };
  const tenure = tenureMap[answers.tenure] || answers.tenure;

  const goalDescriptions: Record<string, string> = {
    "additional-weeks": "additional weeks of severance pay",
    "extended-benefits": "extended health insurance coverage beyond the current period",
    "non-compete-removal": "removal or narrowing of the non-compete clause",
    "positive-reference": "a confirmed written reference or rehire-eligible status",
    "other": "any other reasonable adjustments to the terms",
  };
  const goalsList = answers.goals
    .map((g) => goalDescriptions[g] || g)
    .join("; ");

  const hrContext =
    answers.hrConversation === "open"
      ? "HR has indicated some openness to discussion."
      : answers.hrConversation === "said-final"
      ? "HR has indicated the terms are final, though I want to try respectfully in writing."
      : "I have not yet had a conversation with HR about flexibility.";

  const layoffContext =
    answers.layoffType === "company-wide"
      ? "This was part of a company-wide or team-wide layoff."
      : answers.layoffType === "targeted"
      ? "This was a more targeted separation rather than a broad layoff."
      : "I'm not entirely clear on the scope of the layoff.";

  return `Write a professional severance negotiation email for someone in the following situation. Write ONLY the email — nothing else. Start with "Subject:" on the first line.

Situation:
- They worked at ${company} as ${role} for ${tenure}
- Severance offered: ${ctx.severanceAmount ? ctx.severanceAmount : "a package was offered"}${ctx.severancePaymentType === "lump-sum" ? " as a lump sum" : ctx.severancePaymentType === "continued-payroll" ? " as continued payroll" : ""}
${ctx.severanceSignDeadline ? `- Sign deadline: ${ctx.severanceSignDeadline}` : ""}
${ctx.releaseRequired === "yes" ? "- A release of claims is required to receive severance" : ""}
${ctx.nonCompete === "yes" ? `- A non-compete clause is included${ctx.governingLaw ? ` (governed by ${ctx.governingLaw} law)` : ""}` : ""}
- ${layoffContext}
- ${hrContext}
- What they're hoping to achieve: ${goalsList || "an improved overall package"}

Requirements for the email:
- Professional, warm, and non-confrontational
- 200–280 words
- Acknowledges appreciation for the support during the transition
- References their tenure naturally without making it sound like a threat
- Asks specifically for the goals listed above
- Leaves room for dialogue — not an ultimatum
- Does not use legal language or cite rights
- Does not say the package is inadequate or unfair
- Ends warmly and with openness to discussion

Write the email now. No commentary before or after.`;
}

/* ─── Template fallback ─── */
function generateTemplateEmail(ctx: NegotiationContext, answers: NegotiationAnswers): string {
  const company = ctx.company || "the company";
  const role = ctx.role || "my role";

  const goalDescriptions: Record<string, string> = {
    "additional-weeks": "additional weeks of severance pay",
    "extended-benefits": "extended health insurance coverage",
    "non-compete-removal": "removal or narrowing of the non-compete restriction",
    "positive-reference": "a confirmed reference or rehire-eligible designation",
    "other": "a review of the overall terms",
  };

  const goalsText = answers.goals.length > 0
    ? answers.goals.map((g) => `- ${goalDescriptions[g] || g}`).join("\n")
    : "- A review of the overall package terms";

  const tenureNote =
    answers.tenure === "5-10 years" || answers.tenure === "10+ years"
      ? `Given my ${answers.tenure} with the company, `
      : answers.tenure === "2-5 years"
      ? "Given my time with the company, "
      : "";

  const deadline = ctx.severanceSignDeadline
    ? `\n\nI understand the agreement is due by ${ctx.severanceSignDeadline}, and I want to resolve this well before that date.`
    : "";

  return `Subject: Request to Review Severance Terms — ${role} at ${company}

Dear [HR Contact],

I wanted to reach out regarding the separation agreement for my role as ${role} at ${company}. I genuinely appreciate the thoughtfulness with which the transition has been handled, and I am grateful for the opportunities I had during my time there.

After reviewing the agreement, ${tenureNote}I wanted to respectfully ask whether there is any flexibility in the current terms before I sign. I recognize this may not always be possible, and I raise it only as an open question rather than a condition.

Specifically, I was hoping we might explore:
${goalsText}${deadline}

I want to ensure a smooth and professional transition for everyone involved, and I remain committed to that regardless of the outcome of this request. I would welcome a brief conversation if that would make it easier to discuss.

Thank you sincerely for your time and consideration. I look forward to hearing from you.

Warm regards,
[Your Name]`;
}

/* ─── Route handler ─── */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { context: NegotiationContext; answers: NegotiationAnswers };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { context, answers } = body;

  if (!context || !answers) {
    return NextResponse.json({ error: "Missing context or answers" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no API key, return template immediately
  if (!apiKey) {
    return NextResponse.json({
      email: generateTemplateEmail(context, answers),
      source: "template",
      disclaimer: "This is a template email based on the information you provided. Review it carefully before sending — it is not legal advice. Consider consulting an employment attorney before signing any severance agreement.",
    });
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: "You are a professional writing assistant helping someone navigate a sensitive employment situation. Write clearly, warmly, and professionally. Produce only the requested output with no additional commentary.",
        messages: [{ role: "user", content: buildPrompt(context, answers) }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, await response.text());
      return NextResponse.json({ email: generateTemplateEmail(context, answers), source: "template" });
    }

    const data = await response.json();
    const email = data.content?.[0]?.text?.trim();

    if (!email) {
      return NextResponse.json({ email: generateTemplateEmail(context, answers), source: "template" });
    }

    return NextResponse.json({
      email,
      source: "ai",
      disclaimer: "This email was generated by AI based on the information you provided. Review it carefully before sending — it is not legal advice. Consider consulting an employment attorney before signing any severance agreement.",
    });
  } catch (err) {
    console.error("Email generation error:", err);
    return NextResponse.json({
      email: generateTemplateEmail(context, answers),
      source: "template",
      disclaimer: "This is a template email based on the information you provided. Review it carefully before sending — it is not legal advice. Consider consulting an employment attorney before signing any severance agreement.",
    });
  }
}
