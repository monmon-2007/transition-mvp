import { LayoffIntakeData } from "@/app/onboarding/layoff/page";

export interface LayoffIntakeApiResponse {
  id: number;
  userId: string;
  status: string;
  employer: string | null;
  jobTitle: string | null;
  employmentType: string | null;
  location: string | null;
  lastWorkingDay: string | null;
  terminationDate: string | null;
  severanceOffered: string | null;
  severanceDuration: string | null;
  severancePaymentType: string | null;
  finalPaycheckReceived: string | null;
  ptoPayoutExpected: string | null;
  healthActive: string | null;
  healthEndDate: string | null;
  hsaFsa: string | null;
  commuterBenefits: string | null;
  equityType: string | null;
  unvestedEquity: string | null;
  lastVestingDate: string | null;
  exerciseDeadline: string | null;
  tiedToVisa: string | null;
  visaType: string | null;
  visaDeadlines: string | null;
  activelyLooking: string | null;
  desiredUrgency: string | null;
  freeText: string | null;
  uploadedDocumentsSummary: string | null;
  // New fields
  separationType: string | null;
  rehireEligible: string | null;
  severanceAmount: string | null;
  severanceSignDeadline: string | null;
  releaseRequired: string | null;
  bonusOwed: string | null;
  commissionOwed: string | null;
  cobraMentioned: string | null;
  nonCompete: string | null;
  nonCompeteDuration: string | null;
  nonSolicit: string | null;
  returnEquipmentDeadline: string | null;
  outplacementProvided: string | null;
  outplacementDetails: string | null;
  nonDisparagement: string | null;
  confidentialityObligation: string | null;
  cobraContributionDetails: string | null;
  proRatedBonus: string | null;
  proRatedBonusAmount: string | null;
  governingLaw: string | null;
  documentSummary: string | null;
  monthlyExpenses: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch the current user's layoff intake from the backend.
 * User identity is determined server-side from the NextAuth session.
 * No user ID is sent from the browser.
 */
export async function fetchLayoffIntake(): Promise<LayoffIntakeApiResponse | null> {
  const url = "/api/layoff-intake";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // No X-User-Id header - server extracts from session
    });

    if (response.status === 204 || response.status === 404) {
      // No intake exists yet for this user
      return null;
    }

    if (response.status === 401) {
      // User not authenticated
      throw new Error("Please log in to access your layoff intake");
    }

    if (response.status === 500 || response.status === 502) {
      console.warn("Backend unavailable, treating as no intake");
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch failed:", response.status, errorText);
      throw new Error(`Failed to fetch layoff intake: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching layoff intake:", error.message);
    throw error;
  }
}

/**
 * Save the current user's layoff intake to the backend.
 * User identity is determined server-side from the NextAuth session.
 * No user ID is sent from the browser.
 */
export async function saveLayoffIntake(
  data: LayoffIntakeData,
  status: "draft" | "completed"
): Promise<LayoffIntakeApiResponse> {
  const url = "/api/layoff-intake";

  try {
    console.log("Saving layoff intake, status:", status);

    const payload = {
      status,
      employer: data.employer || null,
      jobTitle: data.jobTitle || null,
      employmentType: data.employmentType || null,
      location: data.location || null,
      lastWorkingDay: data.lastWorkingDay || null,
      terminationDate: data.terminationDate || null,
      severanceOffered: data.severanceOffered || null,
      severanceDuration: data.severanceDuration ? JSON.stringify(data.severanceDuration) : null,
      severancePaymentType: data.severancePaymentType || null,
      finalPaycheckReceived: data.finalPaycheckReceived || null,
      ptoPayoutExpected: data.ptoPayoutExpected || null,
      healthActive: data.healthActive || null,
      healthEndDate: data.healthEndDate || null,
      hsaFsa: data.hsaFsa || null,
      commuterBenefits: data.commuterBenefits || null,
      equityType: data.equityType || null,
      unvestedEquity: data.unvestedEquity || null,
      lastVestingDate: data.lastVestingDate || null,
      exerciseDeadline: data.exerciseDeadline || null,
      tiedToVisa: data.tiedToVisa || null,
      visaType: data.visaType || null,
      visaDeadlines: data.visaDeadlines || null,
      activelyLooking: data.activelyLooking || null,
      desiredUrgency: data.desiredUrgency || null,
      freeText: data.freeText || null,
      uploadedDocumentsSummary: data.uploadedFiles ? JSON.stringify(data.uploadedFiles) : null,
      // New fields
      separationType: data.separationType || null,
      rehireEligible: data.rehireEligible || null,
      severanceAmount: data.severanceAmount || null,
      severanceSignDeadline: data.severanceSignDeadline || null,
      releaseRequired: data.releaseRequired || null,
      bonusOwed: data.bonusOwed || null,
      commissionOwed: data.commissionOwed || null,
      cobraMentioned: data.cobraMentioned || null,
      nonCompete: data.nonCompete || null,
      nonCompeteDuration: data.nonCompeteDuration || null,
      nonSolicit: data.nonSolicit || null,
      returnEquipmentDeadline: data.returnEquipmentDeadline || null,
      outplacementProvided: data.outplacementProvided || null,
      outplacementDetails: data.outplacementDetails || null,
      nonDisparagement: data.nonDisparagement || null,
      confidentialityObligation: data.confidentialityObligation || null,
      cobraContributionDetails: data.cobraContributionDetails || null,
      proRatedBonus: data.proRatedBonus || null,
      proRatedBonusAmount: data.proRatedBonusAmount || null,
      governingLaw: data.governingLaw || null,
      documentSummary: data.documentSummary || null,
    // monthlyExpenses is not part of the intake form — saved separately
    };


    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // No X-User-Id header - server extracts from session
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      throw new Error("Please log in to save your layoff intake");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Save failed:", response.status, errorText);
      throw new Error(`Failed to save layoff intake: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Error saving layoff intake:", error.message);
    throw error;
  }
}

/**
 * Convert API response to frontend LayoffIntakeData format.
 */
export function apiResponseToIntakeData(apiData: LayoffIntakeApiResponse): LayoffIntakeData {
  return {
    uploadedFiles: apiData.uploadedDocumentsSummary
      ? JSON.parse(apiData.uploadedDocumentsSummary)
      : [],
    employer: apiData.employer,
    jobTitle: apiData.jobTitle,
    employmentType: apiData.employmentType as any,
    location: apiData.location,
    lastWorkingDay: apiData.lastWorkingDay,
    terminationDate: apiData.terminationDate,
    severanceOffered: apiData.severanceOffered as any,
    severanceDuration: apiData.severanceDuration
      ? JSON.parse(apiData.severanceDuration)
      : null,
    severancePaymentType: apiData.severancePaymentType as any,
    finalPaycheckReceived: apiData.finalPaycheckReceived as any,
    ptoPayoutExpected: apiData.ptoPayoutExpected as any,
    healthActive: apiData.healthActive as any,
    healthEndDate: apiData.healthEndDate,
    hsaFsa: apiData.hsaFsa as any,
    commuterBenefits: apiData.commuterBenefits as any,
    equityType: apiData.equityType as any,
    unvestedEquity: apiData.unvestedEquity as any,
    lastVestingDate: apiData.lastVestingDate,
    exerciseDeadline: apiData.exerciseDeadline,
    tiedToVisa: apiData.tiedToVisa as any,
    visaType: apiData.visaType,
    visaDeadlines: apiData.visaDeadlines,
    activelyLooking: apiData.activelyLooking as any,
    desiredUrgency: apiData.desiredUrgency as any,
    freeText: apiData.freeText,
    // New fields
    separationType: apiData.separationType,
    rehireEligible: apiData.rehireEligible as any,
    severanceAmount: apiData.severanceAmount,
    severanceSignDeadline: apiData.severanceSignDeadline,
    releaseRequired: apiData.releaseRequired as any,
    bonusOwed: apiData.bonusOwed as any,
    commissionOwed: apiData.commissionOwed as any,
    cobraMentioned: apiData.cobraMentioned as any,
    nonCompete: apiData.nonCompete as any,
    nonCompeteDuration: apiData.nonCompeteDuration,
    nonSolicit: apiData.nonSolicit as any,
    returnEquipmentDeadline: apiData.returnEquipmentDeadline,
    outplacementProvided: apiData.outplacementProvided as any,
    outplacementDetails: apiData.outplacementDetails,
    nonDisparagement: apiData.nonDisparagement as any,
    confidentialityObligation: apiData.confidentialityObligation as any,
    cobraContributionDetails: apiData.cobraContributionDetails,
    proRatedBonus: apiData.proRatedBonus as any,
    proRatedBonusAmount: apiData.proRatedBonusAmount,
    governingLaw: apiData.governingLaw,
    documentSummary: apiData.documentSummary,
    createdAt: apiData.createdAt,
    updatedAt: apiData.updatedAt,
  };
}

/**
 * Save the user's monthly expenses without touching any other intake data.
 */
export async function saveMonthlyExpenses(amount: number): Promise<void> {
  const res = await fetch("/api/layoff-intake/monthly-expenses", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthlyExpenses: amount }),
  });
  if (!res.ok) throw new Error("Failed to save monthly expenses");
}
