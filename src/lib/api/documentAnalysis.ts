/**
 * API helper for document analysis functionality.
 * Handles uploading and analyzing layoff-related documents.
 */

export interface ExtractedField {
  value: string | null;
  confidence: "high" | "medium" | "low" | null;
}

export interface ExtractedLayoffData {
  // Employment / separation details
  employerName?: ExtractedField;
  jobTitle?: ExtractedField;
  employmentType?: ExtractedField;
  location?: ExtractedField;
  terminationDate?: ExtractedField;
  lastWorkingDate?: ExtractedField;
  separationType?: ExtractedField;
  rehireEligible?: ExtractedField;

  // Severance details
  severanceOffered?: ExtractedField;
  severanceAmount?: ExtractedField;
  severanceType?: ExtractedField;
  severanceDurationWeeks?: ExtractedField;
  severancePaymentType?: ExtractedField;
  severanceSignDeadline?: ExtractedField;
  releaseRequired?: ExtractedField;

  // Compensation / payout
  finalPaycheckReceived?: ExtractedField;
  ptoPayoutMentioned?: ExtractedField;
  ptoPayoutAmount?: ExtractedField;
  bonusMentioned?: ExtractedField;
  bonusAmount?: ExtractedField;
  commissionsMentioned?: ExtractedField;
  commissionsAmount?: ExtractedField;

  // Benefits
  benefitsEndDate?: ExtractedField;
  cobraMentioned?: ExtractedField;
  healthInsuranceMentioned?: ExtractedField;
  hsaMentioned?: ExtractedField;
  fsaMentioned?: ExtractedField;
  commuterMentioned?: ExtractedField;
  parkingMentioned?: ExtractedField;

  // Equity / retirement
  rsuMentioned?: ExtractedField;
  esppMentioned?: ExtractedField;
  retirement401kMentioned?: ExtractedField;
  unvestedEquityAmount?: ExtractedField;
  lastVestingDate?: ExtractedField;
  exerciseDeadline?: ExtractedField;

  // Work authorization
  visaMentioned?: ExtractedField;
  visaType?: ExtractedField;
  visaDeadlines?: ExtractedField;

  // Important obligations / restrictions
  returnEquipmentMentioned?: ExtractedField;
  returnEquipmentDeadline?: ExtractedField;
  nonCompeteMentioned?: ExtractedField;
  nonCompeteDuration?: ExtractedField;
  nonSolicitMentioned?: ExtractedField;
  nonSolicitDuration?: ExtractedField;
  nonDisparagement?: ExtractedField;
  confidentialityMentioned?: ExtractedField;
  outplacementMentioned?: ExtractedField;
  outplacementDuration?: ExtractedField;
  outplacementVendor?: ExtractedField;

  // COBRA details
  cobraContributionDetails?: ExtractedField;

  // Pro-rated bonus
  proRatedBonusMentioned?: ExtractedField;
  proRatedBonusAmount?: ExtractedField;

  // Governing law
  governingLaw?: ExtractedField;
}

export interface DocumentAnalysisSummary {
  shortSummary: string;
  documentSummary: string | null; // Comprehensive narrative summary
  confidenceScoreOverall: number; // 0-100
  keyDeadlines: string[];
  possibleActionItems: string[];
  missingImportantInfo: string[];
}

export interface AnalyzedFileInfo {
  fileName: string;
  status: "analyzed" | "partial" | "failed";
  message?: string | null;
}

export interface DocumentAnalysisResponse {
  success: boolean;
  summary: DocumentAnalysisSummary;
  extractedFields: ExtractedLayoffData;
  warnings: string[];
  filesAnalyzed: AnalyzedFileInfo[];
  errorMessage?: string | null;
}

/**
 * Analyze uploaded layoff documents.
 * User identity is determined server-side from NextAuth session.
 *
 * @param files Array of File objects to analyze
 * @returns Analysis response with extracted data
 */
export async function analyzeDocuments(files: File[]): Promise<DocumentAnalysisResponse> {
  const url = "/api/layoff-intake/analyze-documents";

  try {
    // Create form data with files
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // No explicit headers - let browser set Content-Type with boundary for multipart
    });

    if (response.status === 401) {
      throw new Error("Please log in to analyze documents");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.errorMessage || `Analysis failed with status ${response.status}`
      );
    }

    const data: DocumentAnalysisResponse = await response.json();
    return data;

  } catch (error: any) {
    console.error("Error analyzing documents");
    throw error;
  }
}

/**
 * Helper to check if a file type is supported for analysis.
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const supportedExtensions = [".pdf", ".docx", ".txt"];

  return (
    supportedTypes.includes(file.type) ||
    supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

/**
 * Helper to validate files before upload.
 */
export function validateFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: "No files selected" };
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB

  for (const file of files) {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File "${file.name}" is too large (max 10MB)`,
      };
    }

    if (!isSupportedFileType(file)) {
      return {
        valid: false,
        error: `File "${file.name}" has an unsupported type. Please use PDF, DOCX, or TXT files.`,
      };
    }
  }

  return { valid: true };
}
