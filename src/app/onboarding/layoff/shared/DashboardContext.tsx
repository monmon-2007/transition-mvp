"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake, type LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import { fetchTasks, saveTasks } from "@/lib/api/tasks";
import { computeRunway, type RunwayResult } from "@/lib/runway";
import {
  type Task,
  type ResumeVersion,
  type JobApplication,
  type NetworkContact,
  type LayoffData,
  type TimelinePhase,
  apiResumeToLocal,
  apiAppToLocal,
  apiContactToLocal,
  readLocalStorage,
  clearLocalStorage,
} from "./types";
import { buildRoadmap, buildSmartRoadmap, intakeToLayoffData, applyRunwayContext, getTaskPhase } from "./utils";
import {
  fetchResumes,
  createResume as apiCreateResume,
} from "@/lib/api/resumes";
import {
  fetchApplications,
  createApplication as apiCreateApplication,
} from "@/lib/api/applications";
import {
  fetchContacts,
  createContact as apiCreateContact,
} from "@/lib/api/contacts";
import {
  computeJobSearchInsights,
  getNextBestAction,
  type Insight,
  type NextBestAction,
} from "@/lib/jobSearchInsights";

export type DashboardContextValue = {
  intake: LayoffIntakeApiResponse | null;
  refreshIntake: () => Promise<void>;
  layoffData: LayoffData | null;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  displayTasks: Task[];
  resumes: ResumeVersion[];
  setResumes: React.Dispatch<React.SetStateAction<ResumeVersion[]>>;
  applications: JobApplication[];
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  contacts: NetworkContact[];
  setContacts: React.Dispatch<React.SetStateAction<NetworkContact[]>>;
  monthlyExpenses: number | null;
  setMonthlyExpenses: (n: number | null) => void;
  runway: RunwayResult | null;
  weeksSinceLayoff: number;
  progress: number;
  jobSearchInsights: Insight[];
  nextBestAction: NextBestAction | null;
  isQuickStart: boolean;
  isGeneralSearch: boolean;
  timelinePhase: TimelinePhase;
  profileCompleteness: number;
  loading: boolean;
  dataLoaded: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [intake, setIntake] = useState<LayoffIntakeApiResponse | null>(null);
  const [layoffData, setLayoffData] = useState<LayoffData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number | null>(null);
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Main data load
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    async function load() {
      try {
        const intakeData = await fetchLayoffIntake();
        if (!intakeData || intakeData.status === "draft" || !intakeData.status) {
          router.replace("/onboarding");
          return;
        }
        setIntake(intakeData);
        if (intakeData.monthlyExpenses) {
          setMonthlyExpenses(intakeData.monthlyExpenses);
        }
        const data = intakeToLayoffData(intakeData);
        setLayoffData(data);

        const backendTasks = await fetchTasks<Task>();
        if (backendTasks && backendTasks.length > 0) {
          setTasks(backendTasks);
        } else {
          // Compute weeks for time-aware task generation
          const weeks = data.terminationDate
            ? Math.max(0, Math.floor((Date.now() - new Date(data.terminationDate).getTime()) / (1000 * 60 * 60 * 24 * 7)))
            : 0;
          const initial = buildSmartRoadmap(data, intakeData, weeks);
          setTasks(initial);
          await saveTasks(initial);
        }
        setTasksLoaded(true);

        // Load resumes, applications, contacts
        await loadAndMigrateData();
        setDataLoaded(true);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadAndMigrateData() {
      const [backendResumes, backendApps, backendContacts] = await Promise.all([
        fetchResumes().catch(() => []),
        fetchApplications().catch(() => []),
        fetchContacts().catch(() => []),
      ]);

      // Resumes
      if (backendResumes.length > 0) {
        setResumes(backendResumes.map(apiResumeToLocal));
      } else {
        const local = readLocalStorage<ResumeVersion[]>("career-transition:user:resumes");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((r) =>
              apiCreateResume({
                name: r.name,
                targetRole: r.targetRole,
                seniorityLevel: r.seniorityLevel,
                content: r.sourceText,
                status: r.status,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((r) => apiResumeToLocal(r!));
          setResumes(saved);
          clearLocalStorage("career-transition:user:resumes");
        }
      }

      // Applications
      if (backendApps.length > 0) {
        setApplications(backendApps.map(apiAppToLocal));
      } else {
        const local = readLocalStorage<JobApplication[]>("career-transition:user:applications");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((a) =>
              apiCreateApplication({
                company: a.company,
                role: a.role,
                jobLink: a.jobLink,
                status: a.status,
                interviewDate: a.interviewDate,
                notes: a.notes,
                dateApplied: a.dateApplied,
                resumeVersionName: a.resumeVersion,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((a) => apiAppToLocal(a!));
          setApplications(saved);
          clearLocalStorage("career-transition:user:applications");
        }
      }

      // Contacts
      if (backendContacts.length > 0) {
        setContacts(backendContacts.map(apiContactToLocal));
      } else {
        const local = readLocalStorage<NetworkContact[]>("career-transition:user:contacts");
        if (local && local.length > 0) {
          const migrated = await Promise.all(
            local.map((c) =>
              apiCreateContact({
                name: c.name,
                company: c.company,
                relationship: c.relationship,
                lastContactDate: c.lastContact,
                nextFollowUpDate: c.nextFollowUp,
                notes: c.notes,
              }).catch(() => null)
            )
          );
          const saved = migrated.filter(Boolean).map((c) => apiContactToLocal(c!));
          setContacts(saved);
          clearLocalStorage("career-transition:user:contacts");
        }
      }
    }

    load();
  }, [router, sessionStatus]);

  // Auto-save tasks
  useEffect(() => {
    if (!tasksLoaded) return;
    saveTasks(tasks).catch((err) => console.error("Error saving tasks:", err));
  }, [tasks, tasksLoaded]);

  // Derived state
  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "Done").length / tasks.length) * 100);
  }, [tasks]);

  const weeksSinceLayoff = useMemo(() => {
    if (!layoffData?.terminationDate) return 0;
    const diff = new Date().getTime() - new Date(layoffData.terminationDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
  }, [layoffData?.terminationDate]);

  const runway = useMemo(() => {
    if (!intake || monthlyExpenses === null) return null;
    return computeRunway(intake, monthlyExpenses);
  }, [intake, monthlyExpenses]);

  const displayTasks = useMemo(
    () => applyRunwayContext(tasks, runway?.runwayMonths ?? null),
    [tasks, runway]
  );

  const jobSearchInsights = useMemo(
    () =>
      computeJobSearchInsights({
        applications: applications.map((a) => ({
          id: a.id,
          company: a.company,
          role: a.role,
          status: a.status,
          dateApplied: a.dateApplied,
          resumeId: a.resumeId,
          tailored: a.tailored,
        })),
        contacts: contacts.map((c) => ({ id: c.id })),
        resumes: resumes.map((r) => ({
          id: r.id,
          name: r.name,
          targetRole: r.targetRole,
        })),
      }),
    [applications, contacts, resumes]
  );

  const isQuickStart = intake?.status === "quick-start";
  const isGeneralSearch = intake?.quickStartPath === "general-search";

  const timelinePhase: TimelinePhase = useMemo(() => {
    if (weeksSinceLayoff <= 2) return "stabilize";
    if (weeksSinceLayoff <= 4) return "prepare";
    if (weeksSinceLayoff <= 8) return "execute";
    return "persist";
  }, [weeksSinceLayoff]);

  const profileCompleteness = useMemo(() => {
    if (!intake) return 0;
    const fields = [
      intake.employer, intake.jobTitle, intake.terminationDate,
      intake.severanceOffered, intake.healthActive, intake.healthEndDate,
      intake.activelyLooking, intake.desiredUrgency,
      intake.location, intake.employmentType,
    ];
    const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [intake]);

  const refreshIntake = async () => {
    try {
      const intakeData = await fetchLayoffIntake();
      if (intakeData) {
        setIntake(intakeData);
        if (intakeData.monthlyExpenses) setMonthlyExpenses(intakeData.monthlyExpenses);
        setLayoffData(intakeToLayoffData(intakeData));
      }
    } catch (err) {
      console.error("Failed to refresh intake:", err);
    }
  };

  const nextBestAction = useMemo(
    () =>
      getNextBestAction({
        insights: jobSearchInsights,
        tasks: displayTasks.map((t) => ({
          id: t.id,
          title: t.title,
          explanation: t.explanation,
          status: t.status,
          priority: t.priority,
          phase: getTaskPhase(t),
        })),
      }),
    [jobSearchInsights, displayTasks]
  );

  const value: DashboardContextValue = {
    intake,
    refreshIntake,
    layoffData,
    tasks,
    setTasks,
    displayTasks,
    resumes,
    setResumes,
    applications,
    setApplications,
    contacts,
    setContacts,
    monthlyExpenses,
    setMonthlyExpenses,
    runway,
    weeksSinceLayoff,
    progress,
    jobSearchInsights,
    nextBestAction,
    isQuickStart,
    isGeneralSearch,
    timelinePhase,
    profileCompleteness,
    loading,
    dataLoaded,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
