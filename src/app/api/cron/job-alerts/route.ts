import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendClient";
import { sendJobAlertEmail } from "@/lib/emails";
import { computeJDMatch } from "@/lib/jdMatch";
import { scrapeJobs } from "ts-jobspy";

/**
 * Cron endpoint: Send daily job alert emails for users with saved searches.
 * Protected by CRON_SECRET.
 *
 * Flow:
 * 1. Fetch all users who have saved searches with alertFrequency === "daily"
 * 2. For each search, scrape fresh jobs matching the search preferences
 * 3. Compare against previously alerted job IDs to find new matches
 * 4. Send email with new matches
 */

// In-memory store for last-alerted job IDs (per search)
// In production this should be persisted, but for MVP this works
// since cron runs daily and state resets are acceptable
const lastAlertedJobs = new Map<string, Set<string>>();

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function formatSalary(job: any): string {
  if (job.minAmount && job.maxAmount) {
    const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    return `${fmt(job.minAmount)} - ${fmt(job.maxAmount)}`;
  }
  return "";
}

function mapJobType(jobType: string): string | undefined {
  const map: Record<string, string> = {
    "full time": "fulltime", "part time": "parttime",
    "contract": "contract", "internship": "internship",
  };
  return map[jobType?.toLowerCase()] || undefined;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all saved searches with daily alerts from backend
    const searchesRes = await backendFetch("/api/internal/saved-searches-with-alerts");
    if (!searchesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch saved searches", sent: 0 });
    }

    const searchEntries: Array<{
      userId: string;
      email: string;
      name: string;
      searchId: string;
      searchName: string;
      location: string;
      jobType: string;
      remote: string;
      salary: string;
      resumeContent?: string;
      jobTitle?: string;
    }> = await searchesRes.json();

    let sent = 0;

    for (const entry of searchEntries) {
      try {
        const keyword = entry.jobTitle || "software engineer";
        const location = entry.location || "United States";
        const jobType = mapJobType(entry.jobType || "full time");
        const isRemote = entry.remote === "remote" ? true : undefined;

        // Scrape jobs
        const rawJobs = await scrapeJobs({
          siteName: ["linkedin", "indeed"],
          searchTerm: keyword,
          location,
          resultsWanted: 10,
          hoursOld: 24, // only last 24 hours for daily alerts
          jobType,
          isRemote,
          linkedinFetchDescription: true,
          countryIndeed: "USA",
          descriptionFormat: "markdown",
        });

        if (!Array.isArray(rawJobs) || rawJobs.length === 0) continue;

        // Deduplicate
        const seen = new Set<string>();
        const uniqueJobs = rawJobs.filter((job) => {
          const key = job.jobUrl || `${job.company}-${job.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Filter out previously alerted jobs
        const previousIds = lastAlertedJobs.get(entry.searchId) || new Set<string>();
        const newJobs = uniqueJobs.filter((job) => {
          const id = simpleHash(`${job.company}-${job.title}-${job.jobUrl}`);
          return !previousIds.has(id);
        });

        if (newJobs.length === 0) continue;

        // Score against resume
        const resumeText = entry.resumeContent || keyword;
        const scored = newJobs.map((job) => {
          const jdText = job.description || `${job.title} ${job.company}`;
          const match = computeJDMatch(resumeText, jdText);
          return {
            id: simpleHash(`${job.company}-${job.title}-${job.jobUrl}`),
            position: job.title || "",
            company: job.company || "",
            location: job.location || "",
            matchScore: match.score,
            jobUrl: job.jobUrlDirect || job.jobUrl || "",
            salary: formatSalary(job),
          };
        });

        // Sort by match score, take top 5
        scored.sort((a, b) => b.matchScore - a.matchScore);
        const topJobs = scored.slice(0, 5);

        // Send email
        const ok = await sendJobAlertEmail(
          entry.email,
          entry.name || "",
          entry.searchName,
          topJobs,
        );

        if (ok) {
          sent++;
          // Update last-alerted set
          const newIds = new Set(previousIds);
          scored.forEach((j) => newIds.add(j.id));
          lastAlertedJobs.set(entry.searchId, newIds);
        }
      } catch (err) {
        console.error(`Job alert failed for search ${entry.searchId}:`, err);
      }
    }

    return NextResponse.json({ sent, message: `Job alert emails sent: ${sent}` });
  } catch (err) {
    console.error("Job alerts cron error:", err);
    return NextResponse.json({ error: "Job alerts cron failed" }, { status: 500 });
  }
}
