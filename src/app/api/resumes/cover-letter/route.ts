import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/* ── Input validation ── */
const CoverLetterSchema = z.object({
  resumeContent: z.string().min(1, "Resume content is required").max(20_000, "Resume too long"),
  jobDescription: z.string().min(1, "Job description is required").max(10_000, "Job description too long"),
  companyName: z.string().max(200).optional().default(""),
  roleName: z.string().max(200).optional().default(""),
});

/* ── Rate limiter ── */
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const rawBody = await request.json();
    const parsed = CoverLetterSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { resumeContent, jobDescription, companyName, roleName } = parsed.data;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback to template
      return NextResponse.json({
        coverLetter: generateTemplate(companyName, roleName),
        source: "template",
      });
    }

    const systemPrompt = `You are an expert career coach who writes compelling, personalized cover letters.
Your cover letters are:
- Professional but warm and human-sounding
- Specific to the role and company
- Highlight relevant experience from the resume
- Concise (3-4 paragraphs, under 300 words)
- Never generic or formulaic
Do NOT include placeholder brackets. Write a complete, ready-to-send letter.`;

    const userPrompt = `Write a cover letter for this role:

COMPANY: ${companyName || "the company"}
ROLE: ${roleName || "the position"}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

MY RESUME:
${resumeContent.slice(0, 4000)}

Write the complete cover letter. Start with "Dear Hiring Manager," and end with a professional sign-off using "[Your Name]" as the signature.`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return NextResponse.json({
        coverLetter: generateTemplate(companyName, roleName),
        source: "template",
      });
    }

    const data = await response.json();
    const coverLetter = data.content?.[0]?.text || generateTemplate(companyName, roleName);

    return NextResponse.json({
      coverLetter,
      source: data.content?.[0]?.text ? "ai" : "template",
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

function generateTemplate(company?: string, role?: string): string {
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${role || "[Role]"} position at ${company || "[Company]"}. My background and experience align well with what you're looking for, and I'm excited about the opportunity to contribute to your team.

In my previous roles, I have developed deep expertise in the areas most relevant to this position. I bring a track record of delivering results, collaborating effectively with cross-functional teams, and consistently exceeding expectations. I'm particularly drawn to this role because of the opportunity to apply my skills in a new and challenging context.

I would welcome the opportunity to discuss how my experience and enthusiasm can contribute to ${company || "your team"}'s continued success. Thank you for considering my application.

Best regards,
[Your Name]`;
}
