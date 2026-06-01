"use client";

import React from "react";
import { useDashboard } from "../shared/DashboardContext";
import NetworkTab from "@/components/dashboard/NetworkTab";
import LoadingState from "@/components/dashboard/LoadingState";
import { apiContactToLocal, type NetworkContact } from "../shared/types";
import { createContact as apiCreateContact, updateContact as apiUpdateContact } from "@/lib/api/contacts";

export default function NetworkPage() {
  const { contacts, setContacts, dataLoaded } = useDashboard();

  async function addContact(name: string, company: string, relationship: string) {
    const now = new Date().toISOString();
    try {
      const created = await apiCreateContact({
        name,
        company,
        relationship,
        lastContactDate: now,
      });
      setContacts((prev) => [...prev, apiContactToLocal(created)]);
    } catch (err) {
      console.error("Failed to create contact:", err);
    }
  }

  async function handleUpdateContact(id: string, updates: Partial<NetworkContact>) {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    try {
      await apiUpdateContact(id, {
        nextFollowUpDate: updates.nextFollowUp,
        notes: updates.notes,
      });
    } catch (err) {
      console.error("Failed to update contact:", err);
    }
  }

  if (!dataLoaded) {
    return <LoadingState label="Loading contacts..." />;
  }

  return <NetworkTab contacts={contacts} onAdd={addContact} onUpdate={handleUpdateContact} />;
}
