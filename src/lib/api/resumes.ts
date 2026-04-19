export interface ResumeApiResponse {
  id: number;
  name: string;
  targetRole: string;
  seniorityLevel: string | null;
  content: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeCreatePayload {
  name: string;
  targetRole: string;
  seniorityLevel?: string;
  content?: string;
  status?: string;
}

export interface ResumeUpdatePayload {
  name?: string;
  targetRole?: string;
  seniorityLevel?: string;
  content?: string;
  status?: string;
}

export async function fetchResumes(): Promise<ResumeApiResponse[]> {
  const res = await fetch("/api/resumes");
  if (!res.ok) return [];
  return res.json();
}

export async function createResume(payload: ResumeCreatePayload): Promise<ResumeApiResponse> {
  const res = await fetch("/api/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create resume");
  return res.json();
}

export async function updateResume(id: number | string, payload: ResumeUpdatePayload): Promise<ResumeApiResponse> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update resume");
  return res.json();
}

export async function deleteResume(id: number | string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete resume");
}
