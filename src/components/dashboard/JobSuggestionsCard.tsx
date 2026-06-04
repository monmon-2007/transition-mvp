"use client";

import React, { useState, useEffect, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { fetchJobSuggestions, fetchJobDetail, type JobSuggestion, type JobDetail } from "@/lib/api/jobSuggestions";
import {
  Sparkles, ExternalLink, Plus, MapPin, Building2, AlertCircle,
  ChevronDown, ChevronUp, Clock, Briefcase, Users, Loader2, Lock,
} from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { ProBadge } from "@/components/UpgradePrompt";

interface JobSuggestionsCardProps {
  onSave: (job: { company: string; role: string; jobLink: string }) => void;
}

export default function JobSuggestionsCard({ onSave }: JobSuggestionsCardProps) {
  const { isPro, isProPlus, loading: subLoading } = useSubscription();
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, JobDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [visaFilter, setVisaFilter] = useState(false);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJobSuggestions();
      setSuggestions(data.suggestions);
      setSearchQuery(data.searchQuery);
      setGeneratedAt(data.generatedAt);
      if (data.error && data.suggestions.length === 0) {
        setError(data.error);
      }
    } catch {
      setError("Couldn't load job suggestions right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  async function handleExpandJob(job: JobSuggestion) {
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(job.id);

    // Fetch detail if not cached
    if (!jobDetails[job.id] && job.jobUrl) {
      setLoadingDetail(job.id);
      const detail = await fetchJobDetail(job.jobUrl);
      setJobDetails((prev) => ({ ...prev, [job.id]: detail }));
      setLoadingDetail(null);
    }
  }

  function handleSave(job: JobSuggestion) {
    if (savedIds.has(job.id)) return;
    onSave({ company: job.company, role: job.position, jobLink: job.jobUrl });
    setSavedIds((prev) => new Set(prev).add(job.id));
  }

  function scoreColor(score: number) {
    if (score >= 70) return "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 ring-1 ring-amber-200";
    return "text-gray-600 bg-gray-100 ring-1 ring-gray-200";
  }

  function timeAgo(dateStr: string) {
    if (!dateStr) return "";
    const generated = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now.getTime() - generated.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Updated just now";
    if (hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Updated ${days}d ago`;
  }

  const filteredSuggestions = visaFilter
    ? suggestions.filter((j) => j.sponsorship !== "no-sponsorship")
    : suggestions;
  const displayJobs = expanded ? filteredSuggestions : filteredSuggestions.slice(0, 5);
  const isFreeUser = !isPro && !isProPlus && !subLoading;
  const sponsorCount = suggestions.filter((j) => j.sponsorship === "sponsors").length;
  const noSponsorCount = suggestions.filter((j) => j.sponsorship === "no-sponsorship").length;

  // Loading skeleton
  if (loading || subLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-56 bg-gray-100 rounded animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">Finding jobs that match your profile...</p>
      </div>
    );
  }

  // Free-user teaser
  if (isFreeUser) {
    const fakeJobs = [
      { role: "Senior Software Engineer", company: "Tech Corp", match: 92, location: "Remote" },
      { role: "Staff Engineer", company: "Growth Inc", match: 87, location: "San Francisco, CA" },
      { role: "Engineering Manager", company: "Scale AI", match: 81, location: "New York, NY" },
    ];
    return (
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Today&apos;s Jobs for You</h3>
                <ProBadge plan="pro" />
              </div>
              <p className="text-xs text-gray-500">AI-matched jobs refreshed daily</p>
            </div>
          </div>
        </div>
        {/* Blurred teaser jobs */}
        <div className="px-6 pb-5 space-y-2.5 relative">
          {fakeJobs.map((job, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3.5 flex items-start gap-3 blur-[3px] select-none pointer-events-none">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{job.role}</p>
                <p className="text-xs text-gray-500">{job.company}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{job.location}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200">
                {job.match}% match
              </span>
            </div>
          ))}
          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <div className="text-center max-w-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-3">
                <Lock className="w-5 h-5 text-violet-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Unlock AI Job Matches</h4>
              <p className="text-sm text-gray-500 mb-4">
                Get personalized job suggestions matched to your skills and experience, refreshed daily.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Try Pro free for 7 days
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / empty state
  if (error && suggestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Today&apos;s Jobs for You</h3>
        </div>
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">Today&apos;s Jobs for You</h3>
              <ProBadge plan="pro" />
            </div>
            <p className="text-xs text-gray-500">
              {suggestions.length} matches for &ldquo;{searchQuery}&rdquo;
              {generatedAt && <> &middot; {timeAgo(generatedAt)}</>}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          Refreshes daily
        </span>
      </div>

      {/* Visa filter */}
      {(sponsorCount > 0 || noSponsorCount > 0) && (
        <div className="px-6 pb-3 flex items-center gap-2">
          <button
            onClick={() => setVisaFilter(!visaFilter)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              visaFilter
                ? "bg-cyan-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="M12 4v16" />
            </svg>
            Visa Sponsorship
            {visaFilter && ` (${filteredSuggestions.length})`}
          </button>
          {visaFilter && noSponsorCount > 0 && (
            <span className="text-[10px] text-gray-400">
              {noSponsorCount} job{noSponsorCount !== 1 ? "s" : ""} hidden (no sponsorship)
            </span>
          )}
        </div>
      )}

      {/* Job list */}
      <div className="px-6 pb-5 space-y-2.5">
        {displayJobs.map((job) => {
          const isSaved = savedIds.has(job.id);
          const isExpanded = expandedJobId === job.id;
          const detail = jobDetails[job.id];
          const isLoadingDetail = loadingDetail === job.id;

          return (
            <div
              key={job.id}
              className={`rounded-xl border transition-all ${
                isExpanded ? "border-violet-200 bg-violet-50/20 shadow-sm" : "border-gray-100 hover:border-violet-200"
              }`}
            >
              {/* Job row */}
              <div className="flex items-start gap-3 p-3.5">
                {/* Company logo */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => handleExpandJob(job)}
                        className="text-sm font-semibold text-gray-900 hover:text-violet-700 transition-colors text-left truncate block max-w-full"
                      >
                        {job.position}
                      </button>
                      <p className="text-xs text-gray-500 truncate">{job.company}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreColor(job.matchScore)}`}>
                      {job.matchScore}% match
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {job.location && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{job.location}</span>
                      </span>
                    )}
                    {job.salary && job.salary !== "Not specified" && (
                      <span className="text-xs text-emerald-600 font-medium">{job.salary}</span>
                    )}
                    {job.agoTime && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.agoTime}
                      </span>
                    )}
                    {job.sponsorship === "sponsors" && (
                      <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 ring-1 ring-cyan-200 px-2 py-0.5 rounded-full">
                        Sponsors Visa
                      </span>
                    )}
                    {job.sponsorship === "no-sponsorship" && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 ring-1 ring-red-200 px-2 py-0.5 rounded-full">
                        No Sponsorship
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={() => handleSave(job)}
                      disabled={isSaved}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        isSaved
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 cursor-default"
                          : "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Added to Applications
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add to Applications
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleExpandJob(job)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200 transition-all flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Details
                    </button>
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200 transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 mx-3.5 mt-1">
                  {isLoadingDetail ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading job details...
                    </div>
                  ) : detail ? (
                    <div className="space-y-3 pt-3">
                      {/* Metadata badges */}
                      {(detail.seniorityLevel || detail.employmentType || detail.industry || detail.applicantCount) && (
                        <div className="flex flex-wrap gap-2">
                          {detail.seniorityLevel && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full ring-1 ring-indigo-200">
                              <Briefcase className="w-3 h-3" />
                              {detail.seniorityLevel}
                            </span>
                          )}
                          {detail.employmentType && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full ring-1 ring-blue-200">
                              <Clock className="w-3 h-3" />
                              {detail.employmentType}
                            </span>
                          )}
                          {detail.industry && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full ring-1 ring-gray-200">
                              <Building2 className="w-3 h-3" />
                              {detail.industry}
                            </span>
                          )}
                          {detail.applicantCount && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full ring-1 ring-amber-200">
                              <Users className="w-3 h-3" />
                              {detail.applicantCount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {detail.description ? (
                        <div
                          className="text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto prose prose-sm prose-gray [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-semibold"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detail.description) }}
                        />
                      ) : detail.error ? (
                        <p className="text-sm text-gray-500 italic">{detail.error}</p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No description available.{" "}
                          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                            View on LinkedIn
                          </a>
                        </p>
                      )}

                      {/* Matched/missing keywords */}
                      {(job.matchedKeywords.length > 0 || job.missingKeywords.length > 0) && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          {job.matchedKeywords.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-emerald-700 mb-1.5">Matching skills</p>
                              <div className="flex flex-wrap gap-1">
                                {job.matchedKeywords.slice(0, 6).map((kw) => (
                                  <span key={kw} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {job.missingKeywords.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-amber-700 mb-1.5">Skills to highlight</p>
                              <div className="flex flex-wrap gap-1">
                                {job.missingKeywords.slice(0, 6).map((kw) => (
                                  <span key={kw} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-3 italic">
                      <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                        View full listing on LinkedIn
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — show all / collapse */}
      {filteredSuggestions.length > 5 && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> View all {filteredSuggestions.length} suggestions</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
