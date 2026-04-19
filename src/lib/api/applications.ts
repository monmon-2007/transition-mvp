export interface ApplicationApiResponse {
  id: number;
  company: string;
  role: string;
  jobLink: string | null;
  status: string;
  interviewDate: string | null;
  notes: string | null;
  dateApplied: string | null;
  resumeVersionName: string | null;
  resumeId: number | null;
  tailored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationCreatePayload {
  company: string;
  role: string;
  jobLink?: string;
  status?: string;
  interviewDate?: string;
  notes?: string;
  dateApplied?: string;
  resumeVersionName?: string;
  resumeId?: number;
  tailored?: boolean;
}

export interface ApplicationUpdatePayload {
  company?: string;
  role?: string;
  jobLink?: string;
  status?: string;
  interviewDate?: string;
  notes?: string;
  dateApplied?: string;
  resumeVersionName?: string;
  resumeId?: number;
  tailored?: boolean;
}

export async function fetchApplications(): Promise<ApplicationApiResponse[]> {
  const res = await fetch("/api/applications");
  if (!res.ok) return [];
  return res.json();
}

export async function createApplication(payload: ApplicationCreatePayload): Promise<ApplicationApiResponse> {
  const res = await fetch("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create application");
  return res.json();
}

export async function updateApplication(id: number | string, payload: ApplicationUpdatePayload): Promise<ApplicationApiResponse> {
  const res = await fetch(`/api/applications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update application");
  return res.json();
}

export async function deleteApplication(id: number | string): Promise<void> {
  const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete application");
}
