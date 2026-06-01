"use client";

import React, { useMemo } from "react";
import { useDashboard } from "../shared/DashboardContext";
import LoadingState from "@/components/dashboard/LoadingState";
import CalendarView from "@/components/dashboard/CalendarView";

export interface InterviewEvent {
  id: string;
  company: string;
  role: string;
  date: string; // ISO string
}

export default function CalendarPage() {
  const { applications, dataLoaded } = useDashboard();

  const interviewEvents = useMemo<InterviewEvent[]>(
    () =>
      applications
        .filter((a) => a.interviewDate && a.status === "interviewing")
        .map((a) => ({
          id: a.id,
          company: a.company,
          role: a.role,
          date: a.interviewDate!,
        })),
    [applications]
  );

  if (!dataLoaded) {
    return <LoadingState label="Loading calendar..." />;
  }

  return <CalendarView interviewEvents={interviewEvents} />;
}
