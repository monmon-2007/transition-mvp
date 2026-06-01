"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useDashboard } from "../shared/DashboardContext";
import type { IntakeContext } from "../../resume/page";

const ResumeBuilder = dynamic(() => import("../../resume/page"), {
  ssr: false,
}) as React.ComponentType<{ intakeContext?: IntakeContext }>;

export default function ResumesPage() {
  const { intake, runway } = useDashboard();

  return (
    <ResumeBuilder
      intakeContext={{
        role: intake?.jobTitle ?? null,
        company: intake?.employer ?? null,
        runwayRiskLevel: runway?.riskLevel ?? null,
      }}
    />
  );
}
