import { LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import { ResumeApiResponse } from "@/lib/api/resumes";
import { ApplicationApiResponse } from "@/lib/api/applications";
import { ContactApiResponse } from "@/lib/api/contacts";

export type Status = "Not started" | "In progress" | "Done" | "Skipped";
export type TimeBucket = "do-now" | "this-week" | "when-ready";
export type TimelinePhase = "stabilize" | "prepare" | "execute" | "persist";

export type TaskNote = {
  id: string;
  text: string;
  timestamp: string;
};

export type Task = {
  id: string;
  title: string;
  explanation: string;
  why: string;
  status: Status;
  learnMore?: string;
  deadline?: string;
  optional?: boolean;
  category?: string;
  priority?: "high" | "medium" | "low";
  estimatedTime?: string;
  dependencies?: string[];
  notes?: TaskNote[];
  timeBucket?: TimeBucket;
};

export type ResumeVersion = {
  id: string;
  name: string;
  targetRole: string;
  seniorityLevel?: string;
  lastEdited: string;
  status: "draft" | "ready" | "sent";
  notes?: string;
  sourceText?: string;
};

export type InterviewFeedback = {
  interviewerName?: string;
  format: "phone" | "video" | "onsite" | "technical" | "behavioral" | "other";
  difficulty: 1 | 2 | 3 | 4 | 5;
  wentWell: string;
  toImprove: string;
  questionsAsked?: string;
  timestamp: string;
};

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  jobLink?: string;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
  dateApplied?: string;
  lastUpdate: string;
  resumeVersion?: string;
  resumeId?: number;
  tailored?: boolean;
  notes?: string;
  interviewDate?: string;
  interviewFeedback?: InterviewFeedback[];
};

export type NetworkContact = {
  id: string;
  name: string;
  company: string;
  relationship: string;
  lastContact: string;
  nextFollowUp?: string;
  notes?: string;
};

export type SeveranceData =
  | { type: "payroll"; endDate: string }
  | { type: "lump_sum"; paidDate: string; terminationDate: string }
  | null;

export type AccountPresence = "Yes" | "No" | "Unsure";

export type LayoffData = {
  layoffId: string;
  employmentStatus: "unemployed" | "employed";
  severance: SeveranceData;
  accounts: { has401k: AccountPresence; hasHsa: AccountPresence; hasFsa: AccountPresence; hasCommuter: AccountPresence };
  benefitsStatus: { healthPlanActive: boolean; healthEndDate?: string };
  emergencyCashMonths?: number;
  name?: string;
  lastRole?: string;
  lastCompany?: string;
  terminationDate?: string;
};

export type PhaseId = "act-now" | "stabilize" | "career" | "execute" | "ongoing";

export const PHASES: { id: PhaseId; label: string; description: string; border: string; badge: string; dot: string }[] = [
  {
    id: "act-now",
    label: "Act Now",
    description: "Time-sensitive — deadlines and immediate decisions",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
  {
    id: "stabilize",
    label: "Stabilize Your Situation",
    description: "Protect your finances, benefits, and legal standing",
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "career",
    label: "Get Focused",
    description: "Define your direction and build your search assets",
    border: "border-l-violet-500",
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    dot: "bg-violet-500",
  },
  {
    id: "execute",
    label: "Start Your Search",
    description: "Apply, network, and prepare for interviews",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "ongoing",
    label: "Ongoing",
    description: "Lower-urgency items to handle when ready",
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
];

/* API → local type mappers */
export function apiResumeToLocal(r: ResumeApiResponse): ResumeVersion {
  return {
    id: String(r.id),
    name: r.name,
    targetRole: r.targetRole ?? "",
    seniorityLevel: r.seniorityLevel ?? undefined,
    lastEdited: r.updatedAt,
    status: (r.status as ResumeVersion["status"]) ?? "draft",
    sourceText: r.content ?? undefined,
  };
}

export function apiAppToLocal(a: ApplicationApiResponse): JobApplication {
  return {
    id: String(a.id),
    company: a.company,
    role: a.role,
    jobLink: a.jobLink ?? undefined,
    status: (a.status as JobApplication["status"]) ?? "applied",
    dateApplied: a.dateApplied ?? undefined,
    lastUpdate: a.updatedAt,
    resumeVersion: a.resumeVersionName ?? undefined,
    resumeId: a.resumeId ?? undefined,
    tailored: a.tailored ?? false,
    notes: a.notes ?? undefined,
    interviewDate: a.interviewDate ?? undefined,
  };
}

export function apiContactToLocal(c: ContactApiResponse): NetworkContact {
  return {
    id: String(c.id),
    name: c.name,
    company: c.company ?? "",
    relationship: c.relationship ?? "",
    lastContact: c.lastContactDate ?? c.createdAt,
    nextFollowUp: c.nextFollowUpDate ?? undefined,
    notes: c.notes ?? undefined,
  };
}

/* localStorage migration helpers */
export function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearLocalStorage(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
