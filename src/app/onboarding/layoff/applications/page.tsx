"use client";

import React from "react";
import { useDashboard } from "../shared/DashboardContext";
import ApplicationsTab from "@/components/dashboard/ApplicationsTab";
import LoadingState from "@/components/dashboard/LoadingState";
import {
  apiAppToLocal,
  apiResumeToLocal,
  type JobApplication,
  type ResumeVersion,
} from "../shared/types";
import {
  createApplication as apiCreateApplication,
  updateApplication as apiUpdateApplication,
  deleteApplication as apiDeleteApplication,
} from "@/lib/api/applications";

export default function ApplicationsPage() {
  const {
    applications,
    setApplications,
    resumes,
    setResumes,
    jobSearchInsights,
    dataLoaded,
  } = useDashboard();

  async function addApplication(d: {
    company: string;
    role: string;
    jobLink?: string;
    resumeVersion?: string;
    resumeId?: number;
    tailored?: boolean;
  }) {
    const now = new Date().toISOString();
    try {
      const created = await apiCreateApplication({
        company: d.company,
        role: d.role,
        jobLink: d.jobLink,
        status: "applied",
        dateApplied: now,
        resumeVersionName: d.resumeVersion,
        resumeId: d.resumeId,
        tailored: d.tailored,
      });
      setApplications((prev) => [...prev, apiAppToLocal(created)]);
    } catch (err) {
      console.error("Failed to create application:", err);
    }
  }

  async function updateApplication(id: string, updates: Partial<JobApplication>) {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, ...updates, lastUpdate: new Date().toISOString() } : a
      )
    );
    try {
      await apiUpdateApplication(id, {
        company: updates.company,
        role: updates.role,
        jobLink: updates.jobLink,
        status: updates.status,
        interviewDate: updates.interviewDate,
        notes: updates.notes,
        dateApplied: updates.dateApplied,
        resumeVersionName: updates.resumeVersion,
        resumeId: updates.resumeId,
        tailored: updates.tailored,
      });
    } catch (err) {
      console.error("Failed to update application:", err);
    }
  }

  async function handleDelete(id: string) {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiDeleteApplication(id);
    } catch (err) {
      console.error("Failed to delete application:", err);
    }
  }

  function addResumeFromTailor(resume: ResumeVersion) {
    setResumes((prev) => [...prev, resume]);
  }

  if (!dataLoaded) {
    return <LoadingState label="Loading applications..." />;
  }

  return (
    <ApplicationsTab
      applications={applications}
      resumes={resumes}
      onAdd={addApplication}
      onUpdate={updateApplication}
      onDelete={handleDelete}
      onResumeCreated={addResumeFromTailor}
      insights={jobSearchInsights}
    />
  );
}
