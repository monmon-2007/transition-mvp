import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* eslint-disable @typescript-eslint/no-require-imports */
const cheerio = require("cheerio");

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
export type JobDetail = {
  description: string;
  employmentType: string;
  seniorityLevel: string;
  industry: string;
  jobFunction: string;
  applicantCount: string;
};

/* ─────────────────────────────────────────
   Cache — per job URL, 7 day TTL (job posts don't change often)
───────────────────────────────────────── */
const detailCache = new Map<string, { data: JobDetail; fetchedAt: number }>();
const DETAIL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ─────────────────────────────────────────
   Rate limiter — 10 detail fetches per user per hour
───────────────────────────────────────── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

/* ─────────────────────────────────────────
   GET /api/jobs/details?url=<linkedin-job-url>

   Fetches the public LinkedIn job page and extracts
   the full description and metadata.
───────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobUrl = req.nextUrl.searchParams.get("url");
  if (!jobUrl || !jobUrl.includes("linkedin.com")) {
    return NextResponse.json({ error: "Invalid job URL" }, { status: 400 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  // Check cache
  const cached = detailCache.get(jobUrl);
  if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(jobUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not fetch job details. The listing may have been removed." },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract description from the job page
    const description =
      $(".show-more-less-html__markup").html()?.trim() ||
      $(".description__text").html()?.trim() ||
      $('[class*="description"]').first().html()?.trim() ||
      "";

    // Clean the HTML — keep basic formatting
    const cleanDescription = description
      ? description
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

    // Extract metadata from criteria list
    const criteria: Record<string, string> = {};
    $(".description__job-criteria-item").each((_: number, el: any) => {
      const label = $(el).find(".description__job-criteria-subheader").text().trim().toLowerCase();
      const value = $(el).find(".description__job-criteria-text").text().trim();
      if (label && value) criteria[label] = value;
    });

    // Extract applicant count
    const applicantCount =
      $(".num-applicants__caption").text().trim() ||
      $('[class*="applicant"]').first().text().trim() ||
      "";

    const detail: JobDetail = {
      description: cleanDescription,
      employmentType: criteria["employment type"] || "",
      seniorityLevel: criteria["seniority level"] || "",
      industry: criteria["industries"] || criteria["industry"] || "",
      jobFunction: criteria["job function"] || "",
      applicantCount,
    };

    // Cache for 7 days
    detailCache.set(jobUrl, { data: detail, fetchedAt: Date.now() });

    return NextResponse.json(detail);
  } catch (err) {
    console.error("Job detail fetch error:", err);
    return NextResponse.json(
      { error: "Could not fetch job details right now." },
      { status: 502 }
    );
  }
}
