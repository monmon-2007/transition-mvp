"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  fetchLayoffIntake,
  saveLayoffIntake,
  apiResponseToIntakeData,
} from "@/lib/api/layoffIntake";
import {
  analyzeDocuments,
  validateFiles,
  type DocumentAnalysisResponse,
  type ExtractedLayoffData,
} from "@/lib/api/documentAnalysis";

// Structured data model for the intake workflow
type YesNoUnsure = "yes" | "no" | "unsure";

type EmploymentType = "full-time" | "contract" | "intern" | "other" | "unsure";

type UploadedFileMeta = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  label?: string | null;
};

export type LayoffIntakeData = {
  uploadedFiles: UploadedFileMeta[];
  employer?: string | null;
  jobTitle?: string | null;
  employmentType?: EmploymentType | null;
  location?: string | null;
  lastWorkingDay?: string | null;
  terminationDate?: string | null;

  // Separation
  separationType?: string | null;
  rehireEligible?: YesNoUnsure | null;

  // Compensation & severance
  severanceOffered?: YesNoUnsure | null;
  severanceAmount?: string | null;
  proRatedBonus?: YesNoUnsure | null;
  proRatedBonusAmount?: string | null;
  severanceDuration?: { value: number | null; unit: "weeks" | "months" | null } | null;
  severancePaymentType?: "lump-sum" | "continued-payroll" | "unsure" | null;
  severanceSignDeadline?: string | null;
  releaseRequired?: YesNoUnsure | null;
  finalPaycheckReceived?: YesNoUnsure | null;
  ptoPayoutExpected?: YesNoUnsure | null;
  bonusOwed?: YesNoUnsure | null;
  commissionOwed?: YesNoUnsure | null;

  // Benefits
  healthActive?: YesNoUnsure | null;
  healthEndDate?: string | null;
  cobraMentioned?: YesNoUnsure | null;
  cobraContributionDetails?: string | null;
  hsaFsa?: YesNoUnsure | null;
  commuterBenefits?: YesNoUnsure | null;

  // Equity
  equityType?: "rsu" | "options" | "none" | "unsure" | null;
  unvestedEquity?: YesNoUnsure | null;
  lastVestingDate?: string | null;
  exerciseDeadline?: string | null;

  // Legal / work authorization
  tiedToVisa?: "yes" | "no" | null;
  visaType?: string | null;
  visaDeadlines?: string | null;

  // Legal restrictions & obligations
  nonCompete?: YesNoUnsure | null;
  nonCompeteDuration?: string | null;
  nonSolicit?: YesNoUnsure | null;
  nonDisparagement?: YesNoUnsure | null;
  confidentialityObligation?: YesNoUnsure | null;
  returnEquipmentDeadline?: string | null;
  outplacementProvided?: YesNoUnsure | null;
  outplacementDetails?: string | null;
  governingLaw?: string | null;

  // Context
  activelyLooking?: "yes" | "not_yet" | "unsure" | null;
  desiredUrgency?: "asap" | "normal" | "taking_time" | null;
  freeText?: string | null;

  // AI-generated document summary (not user-editable)
  documentSummary?: string | null;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "layoff_intake_v1";

export default function LayoffOnboarding() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [step, setStep] = useState<number>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [data, setData] = useState<Partial<LayoffIntakeData>>({ uploadedFiles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Document analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load saved progress from backend (with localStorage fallback)
  useEffect(() => {
    async function loadIntake() {
      // Wait for session to be ready
      if (sessionStatus === "loading") {
        return;
      }

      // If not authenticated, redirect to login
      if (sessionStatus === "unauthenticated") {
        router.push("/login?next=/onboarding/layoff");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Try to fetch from backend first
        // User identity is validated server-side via NextAuth session
        const backendData = await fetchLayoffIntake();

        if (backendData) {
          // Backend data exists with status completed - redirect to dashboard
          if (backendData.status === "completed") {
            router.push("/onboarding/layoff/summary");
            return;
          }

          // Backend data exists but not completed - use it
          const intakeData = apiResponseToIntakeData(backendData);
          setData(intakeData);
          setFileMeta(intakeData.uploadedFiles || []);
        } else {
          // No backend data - check localStorage for existing draft
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as LayoffIntakeData;
            setData(parsed);
            setFileMeta(parsed.uploadedFiles || []);
          }
        }
      } catch (err: any) {
        console.error("Error loading intake");
        setError(err.message || "Failed to load your saved progress. Please try again.");

        // Fallback to localStorage on error
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as LayoffIntakeData;
            setData(parsed);
            setFileMeta(parsed.uploadedFiles || []);
          }
        } catch {}
      } finally {
        setIsLoading(false);
      }
    }

    loadIntake();
  }, [session, sessionStatus, router]);

  // Autosave on data changes (localStorage + debounced backend draft)
  useEffect(() => {
    const toSave: LayoffIntakeData = {
      uploadedFiles: fileMeta || [],
      employer: (data.employer ?? null) as string | null,
      jobTitle: (data.jobTitle ?? null) as string | null,
      employmentType: (data.employmentType ?? null) as EmploymentType | null,
      location: (data.location ?? null) as string | null,
      lastWorkingDay: (data.lastWorkingDay ?? null) as string | null,
      terminationDate: (data.terminationDate ?? null) as string | null,
      separationType: (data.separationType ?? null) as string | null,
      rehireEligible: (data.rehireEligible ?? null) as YesNoUnsure | null,
      severanceOffered: (data.severanceOffered ?? null) as YesNoUnsure | null,
      severanceAmount: (data.severanceAmount ?? null) as string | null,
      proRatedBonus: (data.proRatedBonus ?? null) as YesNoUnsure | null,
      proRatedBonusAmount: (data.proRatedBonusAmount ?? null) as string | null,
      severanceDuration: (data.severanceDuration ?? null) as any,
      severancePaymentType: (data.severancePaymentType ?? null) as any,
      severanceSignDeadline: (data.severanceSignDeadline ?? null) as string | null,
      releaseRequired: (data.releaseRequired ?? null) as YesNoUnsure | null,
      finalPaycheckReceived: (data.finalPaycheckReceived ?? null) as YesNoUnsure | null,
      ptoPayoutExpected: (data.ptoPayoutExpected ?? null) as YesNoUnsure | null,
      bonusOwed: (data.bonusOwed ?? null) as YesNoUnsure | null,
      commissionOwed: (data.commissionOwed ?? null) as YesNoUnsure | null,
      healthActive: (data.healthActive ?? null) as YesNoUnsure | null,
      healthEndDate: (data.healthEndDate ?? null) as string | null,
      cobraMentioned: (data.cobraMentioned ?? null) as YesNoUnsure | null,
      cobraContributionDetails: (data.cobraContributionDetails ?? null) as string | null,
      hsaFsa: (data.hsaFsa ?? null) as YesNoUnsure | null,
      commuterBenefits: (data.commuterBenefits ?? null) as YesNoUnsure | null,
      equityType: (data.equityType ?? null) as any,
      unvestedEquity: (data.unvestedEquity ?? null) as YesNoUnsure | null,
      lastVestingDate: (data.lastVestingDate ?? null) as string | null,
      exerciseDeadline: (data.exerciseDeadline ?? null) as string | null,
      tiedToVisa: (data.tiedToVisa ?? null) as any,
      visaType: (data.visaType ?? null) as string | null,
      visaDeadlines: (data.visaDeadlines ?? null) as string | null,
      nonCompete: (data.nonCompete ?? null) as YesNoUnsure | null,
      nonCompeteDuration: (data.nonCompeteDuration ?? null) as string | null,
      nonSolicit: (data.nonSolicit ?? null) as YesNoUnsure | null,
      nonDisparagement: (data.nonDisparagement ?? null) as YesNoUnsure | null,
      confidentialityObligation: (data.confidentialityObligation ?? null) as YesNoUnsure | null,
      returnEquipmentDeadline: (data.returnEquipmentDeadline ?? null) as string | null,
      outplacementProvided: (data.outplacementProvided ?? null) as YesNoUnsure | null,
      outplacementDetails: (data.outplacementDetails ?? null) as string | null,
      governingLaw: (data.governingLaw ?? null) as string | null,
      activelyLooking: (data.activelyLooking ?? null) as any,
      desiredUrgency: (data.desiredUrgency ?? null) as any,
      freeText: (data.freeText ?? null) as string | null,
      documentSummary: (data.documentSummary ?? null) as string | null,
      createdAt: (data.createdAt as string) ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Always save to localStorage (instant fallback)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}

    // Debounced backend draft save (only if authenticated)
    if (sessionStatus === "authenticated") {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }

      draftSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveLayoffIntake(toSave, "draft");
        } catch (err) {
          console.warn("Failed to save draft to backend, localStorage still has a copy:", err);
        }
      }, 2000); // Debounce: save 2 seconds after last change
    }
  }, [data, fileMeta, sessionStatus]);

  // Cleanup draft save timeout on unmount
  useEffect(() => {
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  function update<K extends keyof LayoffIntakeData>(key: K, value: LayoffIntakeData[K] | null) {
    setData((d) => ({ ...(d || {}), [key]: value }));
  }

  function handleFileAdd(selected: FileList | null) {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles((prev) => [...prev, ...arr]);
    const metas = arr.map((f) => ({ 
      name: f.name, 
      size: f.size, 
      type: f.type, 
      lastModified: f.lastModified, 
      label: null 
    }));
    setFileMeta((prev) => [...prev, ...metas]);
  }

  function removeFileMeta(idx: number) {
    setFileMeta((m) => {
      const copy = m.slice();
      copy.splice(idx, 1);
      return copy;
    });
    setFiles((f) => {
      const copy = f.slice();
      copy.splice(idx, 1);
      return copy;
    });
  }

  // Prefill form from extracted analysis data
  function prefillFormFromAnalysis(extractedFields: ExtractedLayoffData, summary?: DocumentAnalysisResponse["summary"]) {
    const toYesNoUnsure = (value?: string | null): YesNoUnsure | null => {
      if (!value) return null;
      const val = value.toLowerCase();
      if (val === "yes" || val.startsWith("yes")) return "yes";
      if (val === "no" || val.startsWith("no")) return "no";
      return "unsure";
    };

    // Employment
    if (extractedFields.employerName?.value) update("employer", extractedFields.employerName.value);
    if (extractedFields.jobTitle?.value) update("jobTitle", extractedFields.jobTitle.value);
    if (extractedFields.employmentType?.value) {
      const val = extractedFields.employmentType.value.toLowerCase();
      if (val.includes("full")) update("employmentType", "full-time");
      else if (val.includes("contract")) update("employmentType", "contract");
      else if (val.includes("intern")) update("employmentType", "intern");
    }
    if (extractedFields.location?.value) update("location", extractedFields.location.value);
    if (extractedFields.terminationDate?.value) update("terminationDate", extractedFields.terminationDate.value);
    if (extractedFields.lastWorkingDate?.value) update("lastWorkingDay", extractedFields.lastWorkingDate.value);
    if (extractedFields.separationType?.value) update("separationType", extractedFields.separationType.value);
    if (extractedFields.rehireEligible?.value) update("rehireEligible", toYesNoUnsure(extractedFields.rehireEligible.value));

    // Severance
    if (extractedFields.severanceOffered?.value) update("severanceOffered", toYesNoUnsure(extractedFields.severanceOffered.value));
    if (extractedFields.severanceAmount?.value) update("severanceAmount", extractedFields.severanceAmount.value);
    if (extractedFields.severanceDurationWeeks?.value) {
      const raw = extractedFields.severanceDurationWeeks.value;
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        update("severanceDuration", { value: num, unit: "weeks" });
      }
    }
    if (extractedFields.severancePaymentType?.value) {
      const val = extractedFields.severancePaymentType.value.toLowerCase();
      if (val.includes("lump")) update("severancePaymentType", "lump-sum");
      else if (val.includes("payroll") || val.includes("install") || val.includes("continu")) update("severancePaymentType", "continued-payroll");
    }
    if (extractedFields.severanceSignDeadline?.value) update("severanceSignDeadline", extractedFields.severanceSignDeadline.value);
    if (extractedFields.releaseRequired?.value) update("releaseRequired", toYesNoUnsure(extractedFields.releaseRequired.value));

    // Compensation
    if (extractedFields.finalPaycheckReceived?.value) update("finalPaycheckReceived", toYesNoUnsure(extractedFields.finalPaycheckReceived.value));
    if (extractedFields.ptoPayoutMentioned?.value) update("ptoPayoutExpected", toYesNoUnsure(extractedFields.ptoPayoutMentioned.value));
    if (extractedFields.bonusMentioned?.value) update("bonusOwed", toYesNoUnsure(extractedFields.bonusMentioned.value));
    if (extractedFields.commissionsMentioned?.value) update("commissionOwed", toYesNoUnsure(extractedFields.commissionsMentioned.value));

    // Benefits
    if (extractedFields.benefitsEndDate?.value) update("healthEndDate", extractedFields.benefitsEndDate.value);
    if (extractedFields.healthInsuranceMentioned?.value) update("healthActive", toYesNoUnsure(extractedFields.healthInsuranceMentioned.value));
    if (extractedFields.cobraMentioned?.value) update("cobraMentioned", toYesNoUnsure(extractedFields.cobraMentioned.value));
    if (extractedFields.hsaMentioned?.value) {
      update("hsaFsa", toYesNoUnsure(extractedFields.hsaMentioned.value));
    } else if (extractedFields.fsaMentioned?.value) {
      update("hsaFsa", toYesNoUnsure(extractedFields.fsaMentioned.value));
    }
    if (extractedFields.commuterMentioned?.value) {
      update("commuterBenefits", toYesNoUnsure(extractedFields.commuterMentioned.value));
    } else if (extractedFields.parkingMentioned?.value) {
      update("commuterBenefits", toYesNoUnsure(extractedFields.parkingMentioned.value));
    }

    // Equity
    if (extractedFields.rsuMentioned?.value?.toLowerCase().includes("yes")) {
      update("equityType", "rsu");
    } else if (extractedFields.esppMentioned?.value?.toLowerCase().includes("yes")) {
      update("equityType", "espp" as any);
    }
    if (extractedFields.unvestedEquityAmount?.value) update("unvestedEquity", "yes");
    if (extractedFields.lastVestingDate?.value) update("lastVestingDate", extractedFields.lastVestingDate.value);
    if (extractedFields.exerciseDeadline?.value) update("exerciseDeadline", extractedFields.exerciseDeadline.value);

    // Visa
    if (extractedFields.visaMentioned?.value?.toLowerCase().includes("yes")) update("tiedToVisa", "yes");
    if (extractedFields.visaType?.value) update("visaType", extractedFields.visaType.value);
    if (extractedFields.visaDeadlines?.value) update("visaDeadlines", extractedFields.visaDeadlines.value);

    // Legal restrictions
    if (extractedFields.nonCompeteMentioned?.value) update("nonCompete", toYesNoUnsure(extractedFields.nonCompeteMentioned.value));
    if (extractedFields.nonCompeteDuration?.value) update("nonCompeteDuration", extractedFields.nonCompeteDuration.value);
    if (extractedFields.nonSolicitMentioned?.value) update("nonSolicit", toYesNoUnsure(extractedFields.nonSolicitMentioned.value));
    if (extractedFields.nonDisparagement?.value) update("nonDisparagement", toYesNoUnsure(extractedFields.nonDisparagement.value));
    if (extractedFields.confidentialityMentioned?.value) update("confidentialityObligation", toYesNoUnsure(extractedFields.confidentialityMentioned.value));
    if (extractedFields.returnEquipmentDeadline?.value) update("returnEquipmentDeadline", extractedFields.returnEquipmentDeadline.value);
    if (extractedFields.outplacementMentioned?.value) update("outplacementProvided", toYesNoUnsure(extractedFields.outplacementMentioned.value));
    if (extractedFields.outplacementDuration?.value || extractedFields.outplacementVendor?.value) {
      const parts = [extractedFields.outplacementVendor?.value, extractedFields.outplacementDuration?.value].filter(Boolean);
      update("outplacementDetails", parts.join(" — "));
    }
    if (extractedFields.cobraContributionDetails?.value) update("cobraContributionDetails", extractedFields.cobraContributionDetails.value);
    if (extractedFields.proRatedBonusMentioned?.value) update("proRatedBonus", toYesNoUnsure(extractedFields.proRatedBonusMentioned.value));
    if (extractedFields.proRatedBonusAmount?.value) update("proRatedBonusAmount", extractedFields.proRatedBonusAmount.value);
    if (extractedFields.governingLaw?.value) update("governingLaw", extractedFields.governingLaw.value);

    // Store AI document summary
    if (summary?.documentSummary) {
      update("documentSummary", summary.documentSummary);
    }
  }

  // Handle document analysis
  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      // Validate files
      const validation = validateFiles(files);
      if (!validation.valid) {
        setAnalysisError(validation.error || "Invalid files");
        return;
      }

      // Call API
      const result = await analyzeDocuments(files);

      if (result.success) {
        setAnalysisResult(result);
        // Prefill form and store document summary
        prefillFormFromAnalysis(result.extractedFields, result.summary);
      } else {
        setAnalysisError(result.errorMessage || "Analysis failed");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to analyze documents");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function setFileLabel(idx: number, label: string | null) {
    setFileMeta((m) => m.map((item, i) => (i === idx ? { ...item, label } : item)));
  }

  function next() {
    if (step < 7) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  async function submit() {
    const final: LayoffIntakeData = {
      uploadedFiles: fileMeta,
      employer: (data.employer as string) ?? null,
      jobTitle: (data.jobTitle as string) ?? null,
      employmentType: (data.employmentType as EmploymentType) ?? null,
      location: (data.location as string) ?? null,
      lastWorkingDay: (data.lastWorkingDay as string) ?? null,
      terminationDate: (data.terminationDate as string) ?? null,
      separationType: (data.separationType as string) ?? null,
      rehireEligible: (data.rehireEligible as YesNoUnsure) ?? null,
      severanceOffered: (data.severanceOffered as YesNoUnsure) ?? null,
      severanceAmount: (data.severanceAmount as string) ?? null,
      proRatedBonus: (data.proRatedBonus as YesNoUnsure) ?? null,
      proRatedBonusAmount: (data.proRatedBonusAmount as string) ?? null,
      severanceDuration: (data.severanceDuration as any) ?? null,
      severancePaymentType: (data.severancePaymentType as any) ?? null,
      severanceSignDeadline: (data.severanceSignDeadline as string) ?? null,
      releaseRequired: (data.releaseRequired as YesNoUnsure) ?? null,
      finalPaycheckReceived: (data.finalPaycheckReceived as YesNoUnsure) ?? null,
      ptoPayoutExpected: (data.ptoPayoutExpected as YesNoUnsure) ?? null,
      bonusOwed: (data.bonusOwed as YesNoUnsure) ?? null,
      commissionOwed: (data.commissionOwed as YesNoUnsure) ?? null,
      healthActive: (data.healthActive as YesNoUnsure) ?? null,
      healthEndDate: (data.healthEndDate as string) ?? null,
      cobraMentioned: (data.cobraMentioned as YesNoUnsure) ?? null,
      cobraContributionDetails: (data.cobraContributionDetails as string) ?? null,
      hsaFsa: (data.hsaFsa as YesNoUnsure) ?? null,
      commuterBenefits: (data.commuterBenefits as YesNoUnsure) ?? null,
      equityType: (data.equityType as any) ?? null,
      unvestedEquity: (data.unvestedEquity as YesNoUnsure) ?? null,
      lastVestingDate: (data.lastVestingDate as string) ?? null,
      exerciseDeadline: (data.exerciseDeadline as string) ?? null,
      tiedToVisa: (data.tiedToVisa as any) ?? null,
      visaType: (data.visaType as string) ?? null,
      visaDeadlines: (data.visaDeadlines as string) ?? null,
      nonCompete: (data.nonCompete as YesNoUnsure) ?? null,
      nonCompeteDuration: (data.nonCompeteDuration as string) ?? null,
      nonSolicit: (data.nonSolicit as YesNoUnsure) ?? null,
      nonDisparagement: (data.nonDisparagement as YesNoUnsure) ?? null,
      confidentialityObligation: (data.confidentialityObligation as YesNoUnsure) ?? null,
      returnEquipmentDeadline: (data.returnEquipmentDeadline as string) ?? null,
      outplacementProvided: (data.outplacementProvided as YesNoUnsure) ?? null,
      outplacementDetails: (data.outplacementDetails as string) ?? null,
      governingLaw: (data.governingLaw as string) ?? null,
      activelyLooking: (data.activelyLooking as any) ?? null,
      desiredUrgency: (data.desiredUrgency as any) ?? null,
      freeText: (data.freeText as string) ?? null,
      documentSummary: (data.documentSummary as string) ?? null,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage as backup
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    } catch {}

    // Save to backend
    // User identity is validated server-side via NextAuth session
    try {
      setIsSaving(true);
      setError(null);

      await saveLayoffIntake(final, "completed");

      // After completing intake, go to situation summary first
      router.push("/onboarding/layoff/summary");
    } catch (err: any) {
      console.error("Error saving intake");
      setError(err.message || "Failed to save your information. Please try again.");
      setIsSaving(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileAdd(e.dataTransfer.files);
  }

  const stepTitles = [
    "Document Upload",
    "Employment Details",
    "Compensation & Severance",
    "Benefits Status",
    "Equity & Options",
    "Work Authorization",
    "Additional Context"
  ];

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Layoff Support Intake</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            We're here to help you navigate this transition. Share what you're comfortable with—all fields are optional and your progress is automatically saved.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">
              Step {step} of 7: {stepTitles[step - 1]}
            </span>
            <span className="text-sm text-slate-500">{Math.round((step / 7) * 100)}% complete</span>
          </div>
          <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  s < step
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"
                    : s === step
                    ? "bg-white border-2 border-blue-500 text-blue-600 shadow-md"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {s < step ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  s
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            {/* Step 1: Document Upload */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Documents</h2>
                  <p className="text-slate-600">
                    Share any relevant paperwork you've received. This is completely optional—we can help you either way.
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,image/*,.txt"
                    onChange={(e) => handleFileAdd(e.target.files)}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Choose Files
                    </button>
                    
                    <p className="text-sm text-slate-600 mb-1">or drag and drop them here</p>
                    <p className="text-xs text-slate-500">PDF, DOCX, TXT, JPG, PNG accepted</p>
                  </div>
                </div>

                {fileMeta.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700">Uploaded Files ({fileMeta.length})</h3>
                    {fileMeta.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                          <p className="text-xs text-slate-500">
                            {(m.size / 1024).toFixed(1)} KB • {m.type || "Unknown type"}
                          </p>
                        </div>

                        <input
                          type="text"
                          placeholder="Label (e.g., Severance Letter)"
                          value={m.label ?? ""}
                          onChange={(e) => setFileLabel(i, e.target.value || null)}
                          className="flex-shrink-0 w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <button
                          onClick={() => removeFileMeta(i)}
                          className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Document Analysis Button */}
                {files.length > 0 && !analysisResult && (
                  <div className="mt-6">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Analyzing Documents...
                        </span>
                      ) : (
                        'Analyze My Documents'
                      )}
                    </button>
                    <p className="mt-2 text-sm text-slate-500 text-center">
                      We'll extract key information to help you complete this form faster
                    </p>
                  </div>
                )}

                {/* Analysis Loading State */}
                {isAnalyzing && (
                  <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-1">Analyzing your documents...</h4>
                        <p className="text-sm text-blue-700">Reading your files and extracting key layoff details. This may take 10-30 seconds.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Results */}
                {analysisResult && analysisResult.success && (
                  <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">What We Found</h3>
                        <p className="text-sm text-green-700 mt-1">
                          {analysisResult.filesAnalyzed.length} file(s) analyzed • {analysisResult.summary.confidenceScoreOverall}% confidence
                        </p>
                      </div>
                      <button
                        onClick={() => setAnalysisResult(null)}
                        className="text-green-600 hover:text-green-800 p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {analysisResult.summary.documentSummary && (
                      <div className="mb-4 p-4 bg-white rounded border border-green-100">
                        <h4 className="font-medium text-sm text-slate-700 mb-2">Document Summary</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{analysisResult.summary.documentSummary}</p>
                      </div>
                    )}

                    {!analysisResult.summary.documentSummary && (
                      <div className="mb-4 p-4 bg-white rounded border border-green-100">
                        <p className="text-sm text-slate-700">{analysisResult.summary.shortSummary}</p>
                      </div>
                    )}

                    {analysisResult.summary.keyDeadlines.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-slate-700 mb-2">Key Deadlines:</h4>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {analysisResult.summary.keyDeadlines.map((deadline, i) => (
                            <li key={i}>{deadline}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.summary.possibleActionItems.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-slate-700 mb-2">Recommended Actions:</h4>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {analysisResult.summary.possibleActionItems.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.summary.missingImportantInfo.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-amber-700 mb-2">Missing or Unclear:</h4>
                        <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                          {analysisResult.summary.missingImportantInfo.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setStep(2);
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
                    >
                      Continue with Extracted Information
                    </button>
                  </div>
                )}

                {/* Analysis Error */}
                {analysisError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-red-600 text-xl">⚠️</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-red-900 mb-1">Analysis Failed</h4>
                        <p className="text-sm text-red-700">{analysisError}</p>
                        <button
                          onClick={() => setAnalysisError(null)}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Employment Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Employment Details</h2>
                  <p className="text-slate-600">
                    Help us understand your employment situation. Fill in what you know.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employer Name
                    </label>
                    <input
                      type="text"
                      value={data.employer ?? ""}
                      onChange={(e) => update("employer", e.target.value || null)}
                      placeholder="e.g., Acme Corp"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={data.jobTitle ?? ""}
                      onChange={(e) => update("jobTitle", e.target.value || null)}
                      placeholder="e.g., Software Engineer"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employment Type
                    </label>
                    <select
                      value={(data.employmentType as EmploymentType) ?? "unsure"}
                      onChange={(e) => update("employmentType", e.target.value as EmploymentType)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Prefer not to say</option>
                      <option value="full-time">Full-time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location (State/Country)
                    </label>
                    <input
                      type="text"
                      value={data.location ?? ""}
                      onChange={(e) => update("location", e.target.value || null)}
                      placeholder="e.g., California or United Kingdom"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Last Working Day
                    </label>
                    <input
                      type="date"
                      value={data.lastWorkingDay ?? ""}
                      onChange={(e) => update("lastWorkingDay", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Official Termination Date <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={data.terminationDate ?? ""}
                      onChange={(e) => update("terminationDate", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Separation Type
                    </label>
                    <select
                      value={(data.separationType as string) ?? ""}
                      onChange={(e) => update("separationType", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="">Not sure / Not stated</option>
                      <option value="layoff">Layoff / Reduction in Force</option>
                      <option value="termination">Termination</option>
                      <option value="resignation">Resignation</option>
                      <option value="mutual">Mutual Agreement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Eligible for Rehire?
                    </label>
                    <select
                      value={(data.rehireEligible as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("rehireEligible", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not stated / Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Compensation & Severance */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Compensation & Severance</h2>
                  <p className="text-slate-600">
                    Details about your severance package and final compensation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severance Offered?
                    </label>
                    <select
                      value={(data.severanceOffered as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("severanceOffered", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severance Payment Type
                    </label>
                    <select
                      value={(data.severancePaymentType as any) ?? "unsure"}
                      onChange={(e) => update("severancePaymentType", e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="lump-sum">Lump sum</option>
                      <option value="continued-payroll">Continued payroll</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severance Duration
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={(data.severanceDuration?.value as number) ?? ""}
                        onChange={(e) =>
                          update("severanceDuration", {
                            ...(data.severanceDuration ?? { value: null, unit: "weeks" }),
                            value: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="Duration"
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      />
                      <select
                        value={(data.severanceDuration?.unit as any) ?? "weeks"}
                        onChange={(e) =>
                          update("severanceDuration", {
                            ...(data.severanceDuration ?? { value: null, unit: "weeks" }),
                            unit: e.target.value as any,
                          })
                        }
                        className="w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                      >
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Final Paycheck Received?
                    </label>
                    <select
                      value={(data.finalPaycheckReceived as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("finalPaycheckReceived", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      PTO Payout Expected?
                    </label>
                    <select
                      value={(data.ptoPayoutExpected as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("ptoPayoutExpected", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severance Amount <span className="text-slate-400">(if known)</span>
                    </label>
                    <input
                      type="text"
                      value={data.severanceAmount ?? ""}
                      onChange={(e) => update("severanceAmount", e.target.value || null)}
                      placeholder="e.g., $15,000 or 4 weeks salary"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severance Agreement Sign-By Date
                    </label>
                    <input
                      type="date"
                      value={data.severanceSignDeadline ?? ""}
                      onChange={(e) => update("severanceSignDeadline", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Release of Claims Required?
                    </label>
                    <select
                      value={(data.releaseRequired as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("releaseRequired", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure / Not stated</option>
                      <option value="yes">Yes — must sign a release</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Bonus Owed?
                    </label>
                    <select
                      value={(data.bonusOwed as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("bonusOwed", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Commission Owed?
                    </label>
                    <select
                      value={(data.commissionOwed as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("commissionOwed", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Pro-Rated Bonus Owed?
                    </label>
                    <select
                      value={(data.proRatedBonus as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("proRatedBonus", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Pro-Rated Bonus Amount <span className="text-slate-400">(if known)</span>
                    </label>
                    <input
                      type="text"
                      value={data.proRatedBonusAmount ?? ""}
                      onChange={(e) => update("proRatedBonusAmount", e.target.value || null)}
                      placeholder="e.g., $5,000 or 3 months prorated"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Benefits */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Benefits Status</h2>
                  <p className="text-slate-600">
                    Information about your health insurance and other benefits.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Health Insurance Active?
                    </label>
                    <select
                      value={(data.healthActive as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("healthActive", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Health Insurance End Date
                    </label>
                    <input
                      type="date"
                      value={data.healthEndDate ?? ""}
                      onChange={(e) => update("healthEndDate", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      HSA or FSA Account?
                    </label>
                    <select
                      value={(data.hsaFsa as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("hsaFsa", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Commuter Benefits Account?
                    </label>
                    <select
                      value={(data.commuterBenefits as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("commuterBenefits", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      COBRA Continuation Mentioned?
                    </label>
                    <select
                      value={(data.cobraMentioned as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("cobraMentioned", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      COBRA Contribution Details <span className="text-slate-400">(if known)</span>
                    </label>
                    <input
                      type="text"
                      value={data.cobraContributionDetails ?? ""}
                      onChange={(e) => update("cobraContributionDetails", e.target.value || null)}
                      placeholder="e.g., company covers 3 months at $2,343/mo"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">COBRA Information</p>
                      <p className="text-blue-800">If your health insurance ends, you may be eligible for COBRA continuation coverage. We'll help you navigate these options.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Equity */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Equity & Options</h2>
                  <p className="text-slate-600">
                    Details about stock options, RSUs, or other equity compensation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Equity Type
                    </label>
                    <select
                      value={(data.equityType as any) ?? "unsure"}
                      onChange={(e) => update("equityType", e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="rsu">RSUs (Restricted Stock Units)</option>
                      <option value="options">Stock Options</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Any Unvested Equity?
                    </label>
                    <select
                      value={(data.unvestedEquity as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("unvestedEquity", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Last Vesting Date <span className="text-slate-400">(if known)</span>
                    </label>
                    <input
                      type="date"
                      value={data.lastVestingDate ?? ""}
                      onChange={(e) => update("lastVestingDate", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Exercise Deadline <span className="text-slate-400">(for options)</span>
                    </label>
                    <input
                      type="date"
                      value={data.exerciseDeadline ?? ""}
                      onChange={(e) => update("exerciseDeadline", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-amber-900">
                      <p className="font-medium mb-1">Time-Sensitive</p>
                      <p className="text-amber-800">Stock options often have exercise deadlines (typically 90 days post-termination). We'll help you understand your options and deadlines.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Work Authorization */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Work Authorization</h2>
                  <p className="text-slate-600">
                    Let us know if your employment is connected to visa or work authorization status.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Is your employment tied to a visa or work authorization?
                    </label>
                    <select
                      value={(data.tiedToVisa as any) ?? "no"}
                      onChange={(e) => update("tiedToVisa", e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {data.tiedToVisa === "yes" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Visa Type
                        </label>
                        <input
                          type="text"
                          value={data.visaType ?? ""}
                          onChange={(e) => update("visaType", e.target.value || null)}
                          placeholder="e.g., H-1B, L-1, O-1"
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Known Deadlines or Grace Periods
                        </label>
                        <textarea
                          value={data.visaDeadlines ?? ""}
                          onChange={(e) => update("visaDeadlines", e.target.value || null)}
                          placeholder="Describe any important dates or grace periods you're aware of..."
                          rows={3}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                        />
                      </div>

                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <div className="text-sm text-red-900">
                            <p className="font-medium mb-1">Critical Priority</p>
                            <p className="text-red-800">Visa-related timelines are often strict. We'll prioritize helping you understand your options and connect you with immigration resources.</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 7: Context */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Additional Context</h2>
                  <p className="text-slate-600">
                    Help us understand your priorities and anything else you'd like to share.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Are you actively looking for a new job?
                    </label>
                    <select
                      value={(data.activelyLooking as any) ?? "unsure"}
                      onChange={(e) => update("activelyLooking", e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure yet</option>
                      <option value="yes">Yes, actively searching</option>
                      <option value="not_yet">Not yet, but soon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Timeline Preference
                    </label>
                    <select
                      value={(data.desiredUrgency as any) ?? "normal"}
                      onChange={(e) => update("desiredUrgency", e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="asap">Need help ASAP</option>
                      <option value="normal">Normal timeline</option>
                      <option value="taking_time">Taking my time</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Non-Compete Agreement?
                    </label>
                    <select
                      value={(data.nonCompete as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("nonCompete", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure / Not mentioned</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Non-Compete Duration <span className="text-slate-400">(if yes)</span>
                    </label>
                    <input
                      type="text"
                      value={data.nonCompeteDuration ?? ""}
                      onChange={(e) => update("nonCompeteDuration", e.target.value || null)}
                      placeholder="e.g., 6 months, 1 year"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Non-Solicit Agreement?
                    </label>
                    <select
                      value={(data.nonSolicit as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("nonSolicit", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure / Not mentioned</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Equipment Return Deadline
                    </label>
                    <input
                      type="date"
                      value={data.returnEquipmentDeadline ?? ""}
                      onChange={(e) => update("returnEquipmentDeadline", e.target.value || null)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Outplacement Services Offered?
                    </label>
                    <select
                      value={(data.outplacementProvided as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("outplacementProvided", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Outplacement Details <span className="text-slate-400">(if offered)</span>
                    </label>
                    <input
                      type="text"
                      value={data.outplacementDetails ?? ""}
                      onChange={(e) => update("outplacementDetails", e.target.value || null)}
                      placeholder="e.g., Randstad-RiseSmart — 3 months"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Non-Disparagement Agreement?
                    </label>
                    <select
                      value={(data.nonDisparagement as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("nonDisparagement", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure / Not mentioned</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confidentiality Obligation?
                    </label>
                    <select
                      value={(data.confidentialityObligation as YesNoUnsure) ?? "unsure"}
                      onChange={(e) => update("confidentialityObligation", e.target.value as YesNoUnsure)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="unsure">Not sure / Not mentioned</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Governing Law / State
                    </label>
                    <input
                      type="text"
                      value={data.governingLaw ?? ""}
                      onChange={(e) => update("governingLaw", e.target.value || null)}
                      placeholder="e.g., New York, California"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Anything else you'd like us to know?
                  </label>
                  <textarea
                    value={data.freeText ?? ""}
                    onChange={(e) => update("freeText", e.target.value || null)}
                    placeholder="Share any concerns, questions, or additional context that might be helpful..."
                    rows={6}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  />
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-green-900">
                      <p className="font-medium mb-1">You're Almost Done</p>
                      <p className="text-green-800">Once you submit, we'll review your information and guide you through next steps based on your priorities.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                step === 1
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex items-center gap-3">
              {step === 7 && (
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-all duration-200"
                >
                  Start Over
                </button>
              )}
              
              {step < 7 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete Intake
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Your progress is automatically saved
          </p>
        </div>
      </div>
    </div>
  );
}