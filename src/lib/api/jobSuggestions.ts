export interface JobSuggestion {
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
  sponsorship: "sponsors" | "no-sponsorship" | "unknown";
}

export interface JobSuggestionsResponse {
  suggestions: JobSuggestion[];
  generatedAt: string;
  searchQuery: string;
  error?: string;
}

export interface JobDetail {
  description: string;
  employmentType: string;
  seniorityLevel: string;
  industry: string;
  jobFunction: string;
  applicantCount: string;
  error?: string;
}

export interface JobSearchPreferences {
  location: string;
  jobType: string;       // "full time" | "part time" | "contract" | ""
  remote: string;        // "remote" | "hybrid" | "on site" | ""
  salary: string;        // "40000" | "60000" | "80000" | "100000" | "120000" | ""
}

const PREFS_STORAGE_KEY = "novapivots:job-search-prefs";

export function getJobSearchPreferences(): JobSearchPreferences {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { location: "", jobType: "full time", remote: "", salary: "" };
}

export function saveJobSearchPreferences(prefs: JobSearchPreferences) {
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export async function fetchJobSuggestions(prefs?: JobSearchPreferences): Promise<JobSuggestionsResponse> {
  const p = prefs || getJobSearchPreferences();
  const params = new URLSearchParams();
  if (p.location) params.set("location", p.location);
  if (p.jobType) params.set("jobType", p.jobType);
  if (p.remote) params.set("remote", p.remote);
  if (p.salary) params.set("salary", p.salary);
  const qs = params.toString();
  const res = await fetch(`/api/jobs/suggestions${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    if (res.status === 429) {
      return { suggestions: [], generatedAt: new Date().toISOString(), searchQuery: "", error: "Too many requests. Try again later." };
    }
    throw new Error("Failed to fetch job suggestions");
  }
  return res.json();
}

/* ─────────────────────────────────────────
   Saved searches — localStorage
───────────────────────────────────────── */
export interface SavedSearch {
  id: string;
  name: string;
  prefs: JobSearchPreferences;
  alertFrequency: "daily" | "off";
  createdAt: string;
}

const SAVED_SEARCHES_KEY = "novapivots:saved-searches";

export function getSavedSearches(): SavedSearch[] {
  try {
    const stored = localStorage.getItem(SAVED_SEARCHES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function addSavedSearch(search: SavedSearch) {
  const searches = getSavedSearches();
  searches.push(search);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

export function removeSavedSearch(id: string) {
  const searches = getSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

export function updateSavedSearch(id: string, updates: Partial<SavedSearch>) {
  const searches = getSavedSearches().map((s) =>
    s.id === id ? { ...s, ...updates } : s
  );
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

export async function fetchJobDetail(jobUrl: string): Promise<JobDetail> {
  const res = await fetch(`/api/jobs/details?url=${encodeURIComponent(jobUrl)}`);
  if (!res.ok) {
    if (res.status === 429) {
      return { description: "", employmentType: "", seniorityLevel: "", industry: "", jobFunction: "", applicantCount: "", error: "Too many detail requests. Try again later." };
    }
    return { description: "", employmentType: "", seniorityLevel: "", industry: "", jobFunction: "", applicantCount: "", error: "Could not load job details." };
  }
  return res.json();
}
