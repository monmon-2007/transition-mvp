import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, existingSkills } = await req.json();
  if (!role || typeof role !== "string") {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  const existingList = Array.isArray(existingSkills) ? existingSkills.slice(0, 50) : [];

  const prompt = `You are a career advisor and tech market analyst. Given a target role and the candidate's existing skills, suggest the most in-demand skills they should learn based on current 2025-2026 job market trends.

Target role: ${role}
${existingList.length > 0 ? `Existing skills: ${existingList.join(", ")}` : "No existing skills listed."}

Return a JSON array of exactly 8-12 skill suggestions. Each suggestion should have:
- "skill": the skill name (concise, e.g. "Kubernetes", "System Design", "LLM Fine-tuning")
- "category": one of "technical", "tool", "soft-skill", "framework", "methodology"
- "demand": one of "high", "medium" (how in-demand this skill is right now)
- "reason": one sentence explaining why this skill matters for this role right now

Focus on skills that are:
1. Currently trending in job postings for this role
2. Not already in the candidate's skill set
3. Practical and learnable within weeks/months
4. A mix of technical and soft skills

Return ONLY valid JSON array, no other text.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status);
      return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";

    // Parse the JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 502 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      suggestions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Skill suggestions error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
