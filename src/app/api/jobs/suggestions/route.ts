import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";
import { checkFeatureAccess } from "@/lib/checkSubscription";
import { computeJDMatch } from "@/lib/jdMatch";
import { scrapeJobs } from "ts-jobspy";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
export type JobSuggestion = {
  id: string;
  position: string;
  company: string;
  location: string;
  date: string;
  agoTime: string;
  salary: string;
  jobUrl: string;
  companyLogo: string;
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  description: string;
};

export type JobSuggestionsResponse = {
  suggestions: JobSuggestion[];
  generatedAt: string;
  searchQuery: string;
  error?: string;
};

/* ─────────────────────────────────────────
   In-memory cache — expires daily at 12:00 noon GMT
───────────────────────────────────────── */
type CachedSuggestions = {
  results: JobSuggestionsResponse;
  generatedAt: number;
  prefsHash: string;
};

const suggestionsCache = new Map<string, CachedSuggestions>();

function isCacheValid(cached: CachedSuggestions, prefsHash: string): boolean {
  if (cached.prefsHash !== prefsHash) return false;
  const now = Date.now();
  const lastNoon = new Date();
  lastNoon.setUTCHours(12, 0, 0, 0);
  if (lastNoon.getTime() > now) lastNoon.setUTCDate(lastNoon.getUTCDate() - 1);
  return cached.generatedAt > lastNoon.getTime();
}

/* ─────────────────────────────────────────
   Map job type strings to ts-jobspy format
───────────────────────────────────────── */
function mapJobType(jobType: string): string | undefined {
  const map: Record<string, string> = {
    "full time": "fulltime",
    "part time": "parttime",
    "contract": "contract",
    "internship": "internship",
  };
  return map[jobType.toLowerCase()] || undefined;
}

/* ─────────────────────────────────────────
   Format salary from ts-jobspy compensation data
───────────────────────────────────────── */
function formatSalary(job: any): string {
  if (job.minAmount && job.maxAmount) {
    const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    const interval = job.interval ? `/${job.interval}` : "";
    return `${fmt(job.minAmount)} - ${fmt(job.maxAmount)}${interval}`;
  }
  if (job.minAmount) return `$${Math.round(job.minAmount / 1000)}k+`;
  if (job.maxAmount) return `Up to $${Math.round(job.maxAmount / 1000)}k`;
  return "Not specified";
}

/* ─────────────────────────────────────────
   Format relative time from date
───────────────────────────────────────── */
function formatAgoTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const posted = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

/* ─────────────────────────────────────────
   Simple hash for stable IDs
───────────────────────────────────────── */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/* ─────────────────────────────────────────
   GET /api/jobs/suggestions

   Returns up to 10 curated jobs per day.
   Uses ts-jobspy for LinkedIn + Indeed scraping
   with full job descriptions for accurate matching.
───────────────────────────────────────── */
export async function GET(req: NextRequest) {
  // Auth
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Subscription gate — requires Pro or higher
  const access = await checkFeatureAccess("aiJobMatch");
  if (!access.allowed) {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", requiredPlan: access.requiredPlan, message: "AI job match suggestions require a Pro subscription" },
      { status: 403 }
    );
  }

  // Read preferences from query params
  const { searchParams } = new URL(req.url);
  const prefLocation = searchParams.get("location") || "";
  const prefJobType = searchParams.get("jobType") || "full time";
  const prefRemote = searchParams.get("remote") || "";
  const prefSalary = searchParams.get("salary") || "";

  // Hash prefs for cache invalidation
  const prefsHash = `${prefLocation}|${prefJobType}|${prefRemote}|${prefSalary}`;

  // Cache check — valid until next 12:00 noon GMT, or prefs change
  const cached = suggestionsCache.get(userId);
  if (cached && isCacheValid(cached, prefsHash)) {
    return NextResponse.json(cached.results);
  }

  try {
    // Fetch user profile data in parallel
    const [intakeRes, resumesRes, appsRes] = await Promise.all([
      backendFetch("/api/layoff-intake", { headers: { "X-User-Id": userId } }),
      backendFetch("/api/resumes", { headers: { "X-User-Id": userId } }),
      backendFetch("/api/applications", { headers: { "X-User-Id": userId } }),
    ]);

    const intake = intakeRes.ok ? await intakeRes.json() : null;
    const resumes: any[] = resumesRes.ok ? await resumesRes.json() : [];
    const applications: any[] = appsRes.ok ? await appsRes.json() : [];

    // Build search parameters from profile
    const jobTitle = intake?.jobTitle || "";
    const firstResume = resumes[0];
    const targetRole = firstResume?.targetRole || "";
    const location = intake?.location || "United States";

    // Determine search keyword
    const keyword = jobTitle || targetRole;
    if (!keyword) {
      const response: JobSuggestionsResponse = {
        suggestions: [],
        generatedAt: new Date().toISOString(),
        searchQuery: "",
        error: "Complete your profile (job title or upload a resume) to get personalized job suggestions.",
      };
      return NextResponse.json(response);
    }

    const queryLocation = prefLocation || location;
    const jobType = mapJobType(prefJobType || "full time");
    const isRemote = prefRemote === "remote" ? true : undefined;

    // Scrape jobs from LinkedIn + Indeed with full descriptions
    let rawJobs: any[] = [];
    try {
      rawJobs = await scrapeJobs({
        siteName: ["linkedin", "indeed"],
        searchTerm: keyword,
        location: queryLocation,
        resultsWanted: 15,
        hoursOld: 168, // past week
        jobType,
        isRemote,
        linkedinFetchDescription: true,
        countryIndeed: "USA",
        descriptionFormat: "markdown",
      });
    } catch (scrapeErr) {
      console.error("Job scrape failed:", scrapeErr);
      const response: JobSuggestionsResponse = {
        suggestions: [],
        generatedAt: new Date().toISOString(),
        searchQuery: keyword,
        error: "Couldn't fetch jobs right now. Your suggestions will refresh tomorrow.",
      };
      suggestionsCache.set(userId, { results: response, generatedAt: Date.now() - 23 * 60 * 60 * 1000, prefsHash });
      return NextResponse.json(response);
    }

    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      const response: JobSuggestionsResponse = {
        suggestions: [],
        generatedAt: new Date().toISOString(),
        searchQuery: keyword,
        error: "No matching jobs found this week. Your suggestions will refresh tomorrow.",
      };
      suggestionsCache.set(userId, { results: response, generatedAt: Date.now(), prefsHash });
      return NextResponse.json(response);
    }

    // Deduplicate by jobUrl
    const seen = new Set<string>();
    const uniqueJobs = rawJobs.filter((job) => {
      const key = job.jobUrl || `${job.company}-${job.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out companies user already applied to
    const appliedCompanies = new Set(
      applications.map((a: any) => (a.company || "").toLowerCase().trim())
    );
    const filtered = uniqueJobs.filter(
      (job) => !appliedCompanies.has((job.company || "").toLowerCase().trim())
    );

    // Filter by salary preference if set
    const minSalaryPref = prefSalary ? parseInt(prefSalary, 10) : 0;
    const salaryFiltered = minSalaryPref > 0
      ? filtered.filter((job) => {
          if (!job.maxAmount) return true; // keep jobs without salary info
          return job.maxAmount >= minSalaryPref;
        })
      : filtered;

    // Score each job against user's resume using FULL job descriptions
    const resumeText =
      resumes.find((r: any) => r.content)?.content ||
      `${jobTitle} ${intake?.employer || ""} ${location}`;

    const scored: JobSuggestion[] = salaryFiltered.map((job) => {
      // Use full description for matching — this is the key improvement
      const jdText = job.description
        || `${job.title} ${job.company} ${job.location || ""}`;
      const match = computeJDMatch(resumeText, jdText);
      return {
        id: simpleHash(`${job.company}-${job.title}-${job.jobUrl}`),
        position: job.title || "",
        company: job.company || "",
        location: job.location || "",
        date: job.datePosted || "",
        agoTime: formatAgoTime(job.datePosted),
        salary: formatSalary(job),
        jobUrl: job.jobUrlDirect || job.jobUrl || "",
        companyLogo: job.companyLogo || "",
        matchScore: match.score,
        matchedKeywords: match.matched.slice(0, 10),
        missingKeywords: match.missing.slice(0, 10),
        description: (job.description || "").slice(0, 500),
      };
    });

    // Sort by match score descending, take top 10
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top10 = scored.slice(0, 10);

    const response: JobSuggestionsResponse = {
      suggestions: top10,
      generatedAt: new Date().toISOString(),
      searchQuery: keyword,
    };

    // Cache until next noon GMT
    suggestionsCache.set(userId, { results: response, generatedAt: Date.now(), prefsHash });

    return NextResponse.json(response);
  } catch (err) {
    console.error("Job suggestions error:", err);
    const response: JobSuggestionsResponse = {
      suggestions: [],
      generatedAt: new Date().toISOString(),
      searchQuery: "",
      error: "Something went wrong. Your suggestions will refresh tomorrow.",
    };
    return NextResponse.json(response);
  }
}
