export interface ContactApiResponse {
  id: number;
  name: string;
  company: string | null;
  relationship: string | null;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCreatePayload {
  name: string;
  company?: string;
  relationship?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
}

export interface ContactUpdatePayload {
  name?: string;
  company?: string;
  relationship?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
}

export async function fetchContacts(): Promise<ContactApiResponse[]> {
  const res = await fetch("/api/contacts");
  if (!res.ok) return [];
  return res.json();
}

export async function createContact(payload: ContactCreatePayload): Promise<ContactApiResponse> {
  const res = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
}

export async function updateContact(id: number | string, payload: ContactUpdatePayload): Promise<ContactApiResponse> {
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update contact");
  return res.json();
}

export async function deleteContact(id: number | string): Promise<void> {
  const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete contact");
}
