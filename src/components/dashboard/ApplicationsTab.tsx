"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import DOMPurify from "isomorphic-dompurify";
import type { JobApplication, ResumeVersion, InterviewFeedback } from "@/app/onboarding/layoff/shared/types";
import { Insight, getApplicationWarnings } from "@/lib/jobSearchInsights";
import {
  Plus, AlertTriangle, Wand2, Loader2, LayoutGrid, List, FileText, Mail,
  GraduationCap, Scale, TrendingUp, Sparkles, ExternalLink, MapPin, Building2,
  ChevronDown, ChevronUp, StickyNote, Calendar, Trash2, Wrench, X, Search,
  Settings2, RefreshCw, Clock, Download,
} from "lucide-react";
import { fetchJobSuggestions, type JobSuggestion, type JobSearchPreferences, getJobSearchPreferences, saveJobSearchPreferences } from "@/lib/api/jobSuggestions";
import JobSearchInsightCard from "./JobSearchInsightCard";
import ApplicationKanban from "./ApplicationKanban";
import { computeJDMatch, type JDMatchResult } from "@/lib/jdMatch";
import JDMatchScore from "@/components/JDMatchScore";

const SalaryInsightCard = React.lazy(() => import("./SalaryInsightCard"));
const InterviewPrepPanel = React.lazy(() => import("@/components/InterviewPrepPanel"));
const OfferComparisonCalc = React.lazy(() => import("./OfferComparisonCalc"));
const EmailTemplateLibrary = React.lazy(() => import("@/components/EmailTemplateLibrary"));
const OfferNegotiationGuide = React.lazy(() => import("./OfferNegotiationGuide"));

/* ── Main Component ── */

function ApplicationsTab({
  applications, resumes, onAdd, onUpdate, onDelete, onResumeCreated, insights,
  highlightStale, onHighlightStaleHandled,
}: {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onAdd: (d: {
    company: string; role: string; jobLink?: string;
    resumeVersion?: string; resumeId?: number; tailored?: boolean;
  }) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete?: (id: string) => void;
  onResumeCreated: (r: ResumeVersion) => void;
  insights: Insight[];
  highlightStale?: boolean;
  onHighlightStaleHandled?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "discover" | "tools">("pipeline");

  const tabs = [
    { id: "pipeline" as const, label: "Pipeline", icon: List, badge: applications.length > 0 ? applications.length : null },
    { id: "discover" as const, label: "Discover", icon: Search, badge: null },
    { id: "tools" as const, label: "Tools", icon: Wrench, badge: null },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Tab bar ─── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "text-violet-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tab content ─── */}
      {activeTab === "pipeline" && (
        <PipelineView
          applications={applications}
          resumes={resumes}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onResumeCreated={onResumeCreated}
          insights={insights}
          highlightStale={highlightStale}
          onHighlightStaleHandled={onHighlightStaleHandled}
        />
      )}
      {activeTab === "discover" && <DiscoverView onAdd={onAdd} />}
      {activeTab === "tools" && <ToolsView />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PIPELINE VIEW — manage existing applications
   ═══════════════════════════════════════════════════════════════ */

function PipelineView({
  applications, resumes, onAdd, onUpdate, onDelete, onResumeCreated, insights,
  highlightStale, onHighlightStaleHandled,
}: {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onAdd: (d: {
    company: string; role: string; jobLink?: string;
    resumeVersion?: string; resumeId?: number; tailored?: boolean;
  }) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete?: (id: string) => void;
  onResumeCreated: (r: ResumeVersion) => void;
  insights: Insight[];
  highlightStale?: boolean;
  onHighlightStaleHandled?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company: "", role: "", jobLink: "",
    resumeId: null as number | null,
    resumeVersionName: "",
    tailored: false,
  });
  const [showTailorPanel, setShowTailorPanel] = useState(false);
  const [tailorJd, setTailorJd] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState("");
  const [staleHighlightActive, setStaleHighlightActive] = useState(false);
  const staleRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [jdMatchResult, setJdMatchResult] = useState<JDMatchResult | null>(null);
  const [coverLetterText, setCoverLetterText] = useState("");
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [interviewPrepApp, setInterviewPrepApp] = useState<JobApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | JobApplication["status"]>("all");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackAppId, setFeedbackAppId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    interviewerName: "", format: "video" as InterviewFeedback["format"],
    difficulty: 3 as InterviewFeedback["difficulty"],
    wentWell: "", toImprove: "", questionsAsked: "",
  });

  useEffect(() => {
    if (highlightStale) {
      setStaleHighlightActive(true);
      onHighlightStaleHandled?.();
      setTimeout(() => staleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      setTimeout(() => setStaleHighlightActive(false), 4000);
    }
  }, [highlightStale]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColors: Record<string, string> = {
    saved: "text-gray-500 bg-gray-50 border-gray-200",
    applied: "text-blue-700 bg-blue-50 border-blue-200",
    interviewing: "text-violet-700 bg-violet-50 border-violet-200",
    offer: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rejected: "text-red-600 bg-red-50 border-red-200",
    withdrawn: "text-gray-400 bg-gray-50 border-gray-200",
  };

  const selectedResume = resumes.find((r) => r.id === String(form.resumeId));

  async function handleTailorForJob() {
    if (!selectedResume) return;
    if (!tailorJd.trim()) { setTailorError("Paste the job description first."); return; }
    const content = selectedResume.sourceText;
    if (!content) { setTailorError("This resume has no text content available."); return; }
    setTailoring(true);
    setTailorError("");
    try {
      const res = await fetch("/api/resumes/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContent: content, resumeName: selectedResume.name, jobDescription: tailorJd }),
      });
      if (!res.ok) throw new Error("Tailoring failed");
      const result = await res.json();
      if (result.savedResume) {
        const newResume: ResumeVersion = {
          id: String(result.savedResume.id),
          name: result.savedResume.name,
          targetRole: selectedResume.targetRole,
          lastEdited: result.savedResume.updatedAt,
          status: "draft",
          sourceText: result.tailoredContent,
        };
        onResumeCreated(newResume);
        setForm((f) => ({ ...f, resumeId: result.savedResume.id, resumeVersionName: result.savedResume.name, tailored: true }));
        setShowTailorPanel(false);
        setTailorJd("");
      }
    } catch {
      setTailorError("Tailoring failed. Please try again.");
    } finally {
      setTailoring(false);
    }
  }

  useEffect(() => {
    if (!tailorJd.trim() || !selectedResume?.sourceText) { setJdMatchResult(null); return; }
    const timer = setTimeout(() => {
      setJdMatchResult(computeJDMatch(selectedResume.sourceText!, tailorJd));
    }, 300);
    return () => clearTimeout(timer);
  }, [tailorJd, selectedResume?.sourceText]);

  async function handleGenerateCoverLetter() {
    if (!selectedResume?.sourceText || !tailorJd.trim()) return;
    setGeneratingCoverLetter(true);
    try {
      const res = await fetch("/api/resumes/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: selectedResume.sourceText,
          jobDescription: tailorJd,
          companyName: form.company,
          roleName: form.role,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCoverLetterText(data.coverLetter || "");
    } catch {
      setCoverLetterText("Failed to generate. Please try again.");
    } finally {
      setGeneratingCoverLetter(false);
    }
  }

  function resetForm() {
    setForm({ company: "", role: "", jobLink: "", resumeId: null, resumeVersionName: "", tailored: false });
    setShowTailorPanel(false);
    setTailorJd("");
    setTailorError("");
    setCoverLetterText("");
    setJdMatchResult(null);
    setShowForm(false);
  }

  function handleAdd() {
    if (!form.company || !form.role) return;
    onAdd({
      company: form.company,
      role: form.role,
      jobLink: form.jobLink || undefined,
      resumeVersion: form.resumeVersionName || undefined,
      resumeId: form.resumeId ?? undefined,
      tailored: form.tailored,
    });
    resetForm();
  }

  const resumesForInsights = useMemo(
    () => resumes.map((r) => ({ id: r.id, name: r.name, targetRole: r.targetRole })),
    [resumes]
  );
  const appsForInsights = useMemo(
    () => applications.map((a) => ({
      id: a.id, company: a.company, role: a.role, status: a.status,
      dateApplied: a.dateApplied, resumeId: a.resumeId, tailored: a.tailored,
    })),
    [applications]
  );
  const filteredApplications = useMemo(
    () => statusFilter === "all" ? applications : applications.filter((a) => a.status === statusFilter),
    [applications, statusFilter]
  );
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 };
    applications.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [applications]);
  const highInsights = useMemo(
    () => insights.filter((i) => i.severity === "high"),
    [insights]
  );

  return (
    <div className="space-y-4">
      {/* ─── Pipeline header ─── */}
      <div className="flex items-center justify-end gap-2">
          {/* CSV Export */}
          {applications.length > 0 && (
            <button
              onClick={() => {
                const headers = ["Company", "Role", "Status", "Date Applied", "Interview Date", "Job Link", "Notes"];
                const rows = applications.map((a) => [
                  a.company, a.role, a.status,
                  a.dateApplied ? new Date(a.dateApplied).toLocaleDateString() : "",
                  a.interviewDate ? new Date(a.interviewDate).toLocaleString() : "",
                  a.jobLink || "", (a.notes || "").replace(/"/g, '""'),
                ]);
                const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `novapivots-applications-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-lg transition-colors"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          )}
          {/* View toggle */}
          {applications.length > 0 && (
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 transition-colors ${viewMode === "kanban" ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
      </div>

      {/* ─── High-severity insights ─── */}
      {highInsights.length > 0 && (
        <div className="flex flex-col gap-2">
          {highInsights.map((i) => <JobSearchInsightCard key={i.id} insight={i} />)}
        </div>
      )}

      {/* ─── Filter chips ─── */}
      {applications.length > 0 && viewMode === "list" && (
        <div className="flex flex-wrap gap-1.5">
          {(["all", "saved", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const).map((s) => {
            const isActive = statusFilter === s;
            const count = s === "all" ? applications.length : statusCounts[s];
            if (s !== "all" && count === 0) return null;
            const chipStyles = s === "all"
              ? (isActive ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 bg-gray-100 hover:bg-gray-200")
              : (isActive ? statusColors[s] + " font-semibold ring-1 shadow-sm" : "text-gray-500 bg-gray-50 hover:bg-gray-100");
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full border border-transparent transition-all ${chipStyles}`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Conversion Funnel ─── */}
      {applications.length >= 3 && viewMode === "list" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pipeline Funnel</h4>
          <div className="flex items-center gap-1 text-xs overflow-x-auto">
            {(["applied", "interviewing", "offer"] as const).map((stage, i, arr) => {
              const count = statusCounts[stage] || 0;
              const prevCount = i === 0 ? applications.length : (statusCounts[arr[i - 1]] || 0);
              const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center min-w-[70px]">
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                    <span className="text-gray-500 capitalize">{stage}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex flex-col items-center px-2">
                      <span className="text-gray-300">→</span>
                      <span className={`text-[10px] font-medium ${rate >= 20 ? "text-emerald-600" : rate >= 10 ? "text-amber-600" : "text-gray-400"}`}>
                        {rate}%
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {(statusCounts.rejected || 0) > 0 && (
              <>
                <div className="w-px h-8 bg-gray-200 mx-2" />
                <div className="flex flex-col items-center min-w-[70px]">
                  <span className="text-lg font-bold text-red-500">{statusCounts.rejected}</span>
                  <span className="text-gray-500">Rejected</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Application list ─── */}
      {applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-3xl mb-4">📋</div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Start tracking your applications here</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Log each role you apply to — keeping a record helps you follow up, spot patterns, and stay organized.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add your first application
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        <ApplicationKanban applications={applications} onUpdate={onUpdate} />
      ) : (
        <div ref={staleRef} className="flex flex-col gap-3">
          {staleHighlightActive && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700 font-medium animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Applications highlighted below haven&apos;t moved in over 2 weeks — consider following up.
            </div>
          )}
          {filteredApplications.map((app) => {
            const warnings = getApplicationWarnings(
              { id: app.id, company: app.company, role: app.role, status: app.status, dateApplied: app.dateApplied, resumeId: app.resumeId, tailored: app.tailored },
              appsForInsights,
              resumesForInsights
            );
            const daysSinceApplied = app.dateApplied
              ? Math.floor((Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            const isOverdue = app.status === "applied" && daysSinceApplied > 14;
            const needsFollowUp = app.status === "applied" && daysSinceApplied > 7 && daysSinceApplied <= 14;
            const isStale = staleHighlightActive && isOverdue;
            const isInterviewing = app.status === "interviewing";

            return (
              <div
                key={app.id}
                className={`bg-white border rounded-xl p-4 transition-all hover:shadow-sm ${
                  isStale ? "border-amber-400 ring-2 ring-amber-200"
                  : isOverdue ? "border-red-200"
                  : needsFollowUp ? "border-amber-200"
                  : "border-gray-200"
                }`}
              >
                {/* Row 1: Role + Company + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{app.role}</h3>
                      {app.tailored && (
                        <span className="inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0">
                          <Wand2 className="w-2.5 h-2.5" /> Tailored
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{app.company}</p>
                  </div>
                  <select
                    value={app.status}
                    onChange={(e) => onUpdate(app.id, { status: e.target.value as JobApplication["status"] })}
                    className={`text-xs font-medium border rounded-lg px-2 py-1.5 cursor-pointer flex-shrink-0 ${statusColors[app.status] || statusColors.saved}`}
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>

                {/* Row 2: Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                  {app.dateApplied && <span>Applied {new Date(app.dateApplied).toLocaleDateString()}</span>}
                  {app.resumeVersion && <span>{app.resumeVersion}</span>}
                  {app.jobLink && (
                    <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View posting →
                    </a>
                  )}
                  {isInterviewing && app.interviewDate && (
                    <span className="flex items-center gap-1 text-violet-700 font-medium">
                      <Calendar className="w-3 h-3" />
                      {new Date(app.interviewDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at{" "}
                      {new Date(app.interviewDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                  {isOverdue && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {daysSinceApplied}d — follow up now
                    </span>
                  )}
                  {needsFollowUp && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Clock className="w-3 h-3" />
                      {daysSinceApplied}d — consider following up
                    </span>
                  )}
                </div>

                {/* Row 3: Interview controls */}
                {isInterviewing && (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                      <input
                        type="datetime-local"
                        value={app.interviewDate ? new Date(app.interviewDate).toISOString().slice(0, 16) : ""}
                        onChange={(e) => onUpdate(app.id, { interviewDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        onClick={() => setInterviewPrepApp(app)}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <GraduationCap className="w-3 h-3" />
                        Prep
                      </button>
                      <button
                        onClick={() => setFeedbackAppId(feedbackAppId === app.id ? null : app.id)}
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Debrief{app.interviewFeedback?.length ? ` (${app.interviewFeedback.length})` : ""}
                      </button>
                    </div>
                    {feedbackAppId === app.id && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-emerald-800 mb-3">Post-Interview Debrief</h4>
                        {app.interviewFeedback?.map((fb, i) => (
                          <div key={i} className="mb-3 pb-3 border-b border-emerald-200 last:border-0">
                            <div className="flex items-center gap-2 text-xs text-emerald-700">
                              <span className="font-medium capitalize">{fb.format}</span>
                              <span>·</span>
                              <span>Difficulty: {"★".repeat(fb.difficulty)}{"☆".repeat(5 - fb.difficulty)}</span>
                              <span>·</span>
                              <span>{new Date(fb.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1"><strong>Went well:</strong> {fb.wentWell}</p>
                            <p className="text-xs text-gray-700"><strong>To improve:</strong> {fb.toImprove}</p>
                          </div>
                        ))}
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 gap-2">
                            <select value={feedbackForm.format}
                              onChange={(e) => setFeedbackForm({ ...feedbackForm, format: e.target.value as any })}
                              className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white">
                              <option value="phone">Phone</option>
                              <option value="video">Video</option>
                              <option value="onsite">On-site</option>
                              <option value="technical">Technical</option>
                              <option value="behavioral">Behavioral</option>
                              <option value="other">Other</option>
                            </select>
                            <select value={feedbackForm.difficulty}
                              onChange={(e) => setFeedbackForm({ ...feedbackForm, difficulty: parseInt(e.target.value) as any })}
                              className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white">
                              <option value={1}>Easy (1/5)</option>
                              <option value={2}>Moderate (2/5)</option>
                              <option value={3}>Medium (3/5)</option>
                              <option value={4}>Hard (4/5)</option>
                              <option value={5}>Very Hard (5/5)</option>
                            </select>
                            <input value={feedbackForm.interviewerName}
                              onChange={(e) => setFeedbackForm({ ...feedbackForm, interviewerName: e.target.value })}
                              placeholder="Interviewer name"
                              className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5" />
                          </div>
                          <textarea value={feedbackForm.wentWell}
                            onChange={(e) => setFeedbackForm({ ...feedbackForm, wentWell: e.target.value })}
                            placeholder="What went well?"
                            className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 resize-none h-14" />
                          <textarea value={feedbackForm.toImprove}
                            onChange={(e) => setFeedbackForm({ ...feedbackForm, toImprove: e.target.value })}
                            placeholder="What to improve?"
                            className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 resize-none h-14" />
                          <button
                            onClick={() => {
                              if (!feedbackForm.wentWell.trim() && !feedbackForm.toImprove.trim()) return;
                              const newFeedback: InterviewFeedback = {
                                ...feedbackForm,
                                interviewerName: feedbackForm.interviewerName || undefined,
                                questionsAsked: feedbackForm.questionsAsked || undefined,
                                timestamp: new Date().toISOString(),
                              };
                              const existing = app.interviewFeedback || [];
                              onUpdate(app.id, { interviewFeedback: [...existing, newFeedback] });
                              setFeedbackForm({ interviewerName: "", format: "video", difficulty: 3, wentWell: "", toImprove: "", questionsAsked: "" });
                            }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg w-fit transition-colors"
                          >
                            Save debrief
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Row 4: Actions */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setExpandedNoteId(expandedNoteId === app.id ? null : app.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      app.notes ? "text-amber-600 hover:text-amber-700" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    {app.notes ? "Notes" : "Add note"}
                  </button>
                  {notesSaved === app.id && (
                    <span className="text-[10px] text-emerald-600 font-medium">Saved</span>
                  )}
                  {warnings.length > 0 && warnings.map((w) => (
                    <span key={w} className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {w}
                    </span>
                  ))}
                  {onDelete && (
                    <div className="ml-auto flex items-center gap-1.5">
                      {confirmDeleteId === app.id ? (
                        <>
                          <span className="text-[11px] text-red-600">Delete?</span>
                          <button
                            onClick={() => { onDelete(app.id); setConfirmDeleteId(null); }}
                            className="text-[11px] font-medium text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(app.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded notes */}
                {expandedNoteId === app.id && (
                  <textarea
                    defaultValue={app.notes || ""}
                    placeholder="Add notes about this application..."
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val !== (app.notes || "")) {
                        onUpdate(app.id, { notes: val });
                        setNotesSaved(app.id);
                        setTimeout(() => setNotesSaved(null), 2000);
                      }
                    }}
                    className="mt-2 w-full text-xs text-gray-700 px-3 py-2 border border-gray-200 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add Application modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-base font-semibold text-gray-900">Add Application</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Company *</label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme Corp"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Senior PM"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Job Link</label>
                <input
                  value={form.jobLink}
                  onChange={(e) => setForm({ ...form, jobLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Resume</label>
                <select
                  value={form.resumeId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? parseInt(e.target.value) : null;
                    const r = resumes.find((r) => r.id === e.target.value);
                    setForm({ ...form, resumeId: id, resumeVersionName: r?.name ?? "", tailored: false });
                    setShowTailorPanel(false);
                  }}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="">No resume selected</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.targetRole ? ` — ${r.targetRole}` : ""}
                    </option>
                  ))}
                </select>
                {form.tailored && (
                  <p className="text-xs text-violet-600 mt-1 flex items-center gap-1">
                    <Wand2 className="w-3 h-3" /> Tailored resume selected
                  </p>
                )}
              </div>

              {/* Tailor panel */}
              {selectedResume && !form.tailored && (
                <div>
                  {!showTailorPanel ? (
                    <button
                      type="button"
                      onClick={() => setShowTailorPanel(true)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Tailor resume for this job
                    </button>
                  ) : (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-violet-800 mb-2">Tailor &ldquo;{selectedResume.name}&rdquo; for this role</p>
                      <textarea
                        value={tailorJd}
                        onChange={(e) => setTailorJd(e.target.value)}
                        placeholder="Paste the job description here..."
                        className="w-full text-xs px-3 py-2 border border-violet-200 rounded-lg resize-none h-28 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
                      />
                      {jdMatchResult && <div className="mb-2"><JDMatchScore result={jdMatchResult} /></div>}
                      {tailorError && <p className="text-xs text-red-500 mb-2">{tailorError}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={handleTailorForJob} disabled={tailoring}
                          className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                          {tailoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          {tailoring ? "Tailoring..." : "Tailor resume"}
                        </button>
                        <button type="button" onClick={handleGenerateCoverLetter} disabled={generatingCoverLetter || !tailorJd.trim()}
                          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                          {generatingCoverLetter ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                          {generatingCoverLetter ? "Writing..." : "Cover letter"}
                        </button>
                        <button type="button"
                          onClick={() => { setShowTailorPanel(false); setTailorJd(""); setTailorError(""); setCoverLetterText(""); setJdMatchResult(null); }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                      {coverLetterText && (
                        <div className="mt-3 bg-white border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-800 mb-2">Cover Letter</p>
                          <textarea
                            value={coverLetterText}
                            onChange={(e) => setCoverLetterText(e.target.value)}
                            className="w-full text-xs text-gray-700 font-mono leading-relaxed resize-none h-48 focus:outline-none"
                            spellCheck
                          />
                          <button type="button" onClick={() => navigator.clipboard.writeText(coverLetterText)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                            Copy to clipboard
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={handleAdd}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Add application
                </button>
                <button onClick={resetForm}
                  className="text-sm text-gray-500 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      <Suspense fallback={null}>
        {interviewPrepApp && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <InterviewPrepPanel
                jobDescription={interviewPrepApp.notes || interviewPrepApp.role}
                roleTitle={interviewPrepApp.role}
                onClose={() => setInterviewPrepApp(null)}
              />
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DISCOVER VIEW — find new jobs
   ═══════════════════════════════════════════════════════════════ */

function DiscoverView({ onAdd }: {
  onAdd: (d: { company: string; role: string; jobLink?: string }) => void;
}) {
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, import("@/lib/api/jobSuggestions").JobDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<JobSearchPreferences>(() => getJobSearchPreferences());
  const [prefsSaved, setPrefsSaved] = useState(false);

  const load = useCallback(async (p?: JobSearchPreferences) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJobSuggestions(p || prefs);
      setSuggestions(data.suggestions);
      if (data.error && data.suggestions.length === 0) setError(data.error);
    } catch {
      setError("Couldn't load suggestions.");
    } finally {
      setLoading(false);
    }
  }, [prefs]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSavePrefs() {
    saveJobSearchPreferences(prefs);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
    load(prefs);
    setShowPrefs(false);
  }

  function handleSave(job: JobSuggestion) {
    if (savedIds.has(job.id)) return;
    onAdd({ company: job.company, role: job.position, jobLink: job.jobUrl || undefined });
    setSavedIds((prev) => new Set(prev).add(job.id));
  }

  async function handleExpand(job: JobSuggestion) {
    if (expandedJobId === job.id) { setExpandedJobId(null); return; }
    setExpandedJobId(job.id);
    if (!jobDetails[job.id] && job.jobUrl) {
      setLoadingDetail(job.id);
      const { fetchJobDetail } = await import("@/lib/api/jobSuggestions");
      const detail = await fetchJobDetail(job.jobUrl);
      setJobDetails((prev) => ({ ...prev, [job.id]: detail }));
      setLoadingDetail(null);
    }
  }

  function scoreColor(score: number) {
    if (score >= 70) return "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 ring-1 ring-amber-200";
    return "text-gray-600 bg-gray-100 ring-1 ring-gray-200";
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-gray-700">Finding jobs matched to your profile...</span>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Couldn&apos;t load suggestions</h3>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-700 mb-1">No suggestions yet</h3>
        <p className="text-sm text-gray-400">Complete your profile to get personalized job matches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Matched for You</h3>
            <p className="text-xs text-gray-500">{suggestions.length} jobs from LinkedIn · Refreshes daily at noon</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
            showPrefs ? "border-violet-300 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Preferences
        </button>
      </div>

      {/* Preferences panel */}
      {showPrefs && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Search Preferences</h4>
          <p className="text-xs text-gray-500 mb-4">
            Set your preferences once — jobs will be tailored to these filters. Changes take effect on the next refresh.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Location</label>
              <input
                value={prefs.location}
                onChange={(e) => setPrefs({ ...prefs, location: e.target.value })}
                placeholder="e.g. New York, Remote, United States"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Minimum Salary</label>
              <select
                value={prefs.salary}
                onChange={(e) => setPrefs({ ...prefs, salary: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="">Any salary</option>
                <option value="40000">$40,000+</option>
                <option value="60000">$60,000+</option>
                <option value="80000">$80,000+</option>
                <option value="100000">$100,000+</option>
                <option value="120000">$120,000+</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Job Type</label>
              <select
                value={prefs.jobType}
                onChange={(e) => setPrefs({ ...prefs, jobType: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="full time">Full-time</option>
                <option value="part time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
                <option value="">Any type</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Work Mode</label>
              <select
                value={prefs.remote}
                onChange={(e) => setPrefs({ ...prefs, remote: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="">Any mode</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on site">On-site</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={handleSavePrefs}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Save & Refresh Jobs
            </button>
            <button
              onClick={() => setShowPrefs(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            {prefsSaved && (
              <span className="text-xs text-emerald-600 font-medium">Preferences saved!</span>
            )}
          </div>
        </div>
      )}

      {/* Active filters display */}
      {(prefs.location || prefs.salary || prefs.remote || prefs.jobType !== "full time") && !showPrefs && (
        <div className="flex flex-wrap gap-1.5">
          {prefs.location && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {prefs.location}
            </span>
          )}
          {prefs.jobType && prefs.jobType !== "full time" && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{prefs.jobType}</span>
          )}
          {prefs.remote && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{prefs.remote}</span>
          )}
          {prefs.salary && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">${parseInt(prefs.salary).toLocaleString()}+</span>
          )}
        </div>
      )}

      {/* Job cards — more spacious layout */}
      <div className="space-y-3">
        {suggestions.map((job) => {
          const isSaved = savedIds.has(job.id);
          const isExpanded = expandedJobId === job.id;
          const detail = jobDetails[job.id];
          const isLoadingDetail = loadingDetail === job.id;

          return (
            <div
              key={job.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? "border-violet-200 shadow-md" : "border-gray-200 hover:border-violet-200 hover:shadow-sm"
              }`}
            >
              {/* Job header */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleExpand(job)}
                    className="text-sm font-semibold text-gray-900 hover:text-violet-700 truncate block text-left transition-colors"
                  >
                    {job.position}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="font-medium text-gray-700">{job.company}</span>
                    {job.location && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{job.location}
                        </span>
                      </>
                    )}
                    {job.agoTime && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                        <span>{job.agoTime}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${scoreColor(job.matchScore)}`}>
                  {job.matchScore}% match
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSave(job)}
                    disabled={isSaved}
                    className={`text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                      isSaved
                        ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 cursor-default"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {isSaved ? (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Added</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Add to Pipeline</>
                    )}
                  </button>
                  {job.jobUrl && (
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="View on LinkedIn"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Expanded details — full width, no cramming */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  {isLoadingDetail ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading job details...
                    </div>
                  ) : detail?.description ? (
                    <div className="space-y-3">
                      {/* Metadata badges */}
                      {(detail.seniorityLevel || detail.employmentType || detail.industry || detail.applicantCount) && (
                        <div className="flex flex-wrap gap-2">
                          {detail.seniorityLevel && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{detail.seniorityLevel}</span>
                          )}
                          {detail.employmentType && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{detail.employmentType}</span>
                          )}
                          {detail.industry && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{detail.industry}</span>
                          )}
                          {detail.applicantCount && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{detail.applicantCount} applicants</span>
                          )}
                        </div>
                      )}
                      {/* Match keywords */}
                      {job.matchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {job.matchedKeywords.slice(0, 8).map((kw) => (
                            <span key={kw} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              {kw}
                            </span>
                          ))}
                          {job.missingKeywords.slice(0, 4).map((kw) => (
                            <span key={kw} className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full line-through">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Description */}
                      <div
                        className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto prose prose-sm prose-gray [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detail.description) }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-2 italic">
                      {detail?.error || "No description available."}{" "}
                      <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">View on LinkedIn</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOOLS VIEW — salary, offers, templates
   ═══════════════════════════════════════════════════════════════ */

function ToolsView() {
  const [activeTool, setActiveTool] = useState<"salary" | "offers" | "templates" | "negotiation" | null>(null);

  const tools = [
    {
      id: "salary" as const,
      label: "Salary Insights",
      description: "Research compensation ranges for your target roles and locations",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "offers" as const,
      label: "Compare Offers",
      description: "Side-by-side comparison of compensation packages to make informed decisions",
      icon: Scale,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      id: "templates" as const,
      label: "Email Templates",
      description: "Professional templates for follow-ups, thank-yous, and negotiations",
      icon: Mail,
      color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      id: "negotiation" as const,
      label: "Negotiate Offers",
      description: "Counter-offer templates, timing strategy, and negotiation playbook",
      icon: Sparkles,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Utilities to help you through the job search process.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`text-left bg-white border rounded-xl p-5 transition-all hover:shadow-sm hover:border-gray-300 ${
                activeTool === tool.id ? "ring-2 ring-violet-200 border-violet-300" : "border-gray-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 ${tool.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{tool.label}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
            </button>
          );
        })}
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
        </div>
      }>
        {activeTool === "salary" && <SalaryInsightCard onClose={() => setActiveTool(null)} />}
        {activeTool === "offers" && <OfferComparisonCalc onClose={() => setActiveTool(null)} />}
        {activeTool === "templates" && <EmailTemplateLibrary context={{}} onClose={() => setActiveTool(null)} />}
        {activeTool === "negotiation" && <OfferNegotiationGuide onClose={() => setActiveTool(null)} />}
      </Suspense>
    </div>
  );
}

export { ApplicationsTab };
export default ApplicationsTab;
