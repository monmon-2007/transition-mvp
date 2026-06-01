"use client";

import React, { useState, useEffect } from "react";
import type { NetworkContact } from "@/app/onboarding/layoff/shared/types";
import { Plus, Clock, Mail, Calendar, StickyNote } from "lucide-react";
import EmailTemplateLibrary from "@/components/EmailTemplateLibrary";

function NetworkTab({
  contacts, onAdd, onUpdate, openForm, onFormOpened,
}: {
  contacts: NetworkContact[];
  onAdd: (name: string, company: string, relationship: string) => void;
  onUpdate?: (id: string, updates: Partial<NetworkContact>) => void;
  openForm?: boolean;
  onFormOpened?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", relationship: "" });
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateContext, setTemplateContext] = useState<{ contactName?: string }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Open contact form when parent triggers "add_contact" action
  useEffect(() => {
    if (openForm) {
      setShowForm(true);
      onFormOpened?.();
    }
  }, [openForm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Network & Outreach</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Contact</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Relationship</label>
              <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Former manager"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (form.name) { onAdd(form.name, form.company, form.relationship); setForm({ name: "", company: "", relationship: "" }); setShowForm(false); } }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Add contact
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-3xl mb-4">🤝</div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Add your first contact</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Warm introductions convert to interviews at a much higher rate than cold applications. Start with former colleagues, managers, or classmates.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add a contact
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => {
            const daysSinceContact = Math.floor(
              (Date.now() - new Date(contact.lastContact).getTime()) / (1000 * 60 * 60 * 24)
            );
            const hasScheduledFollowUp = !!contact.nextFollowUp;
            const isOverdue = hasScheduledFollowUp && new Date(contact.nextFollowUp!) < new Date();
            const needsFollowUp = !hasScheduledFollowUp && daysSinceContact > 14;
            const isExpanded = expandedId === contact.id;

            return (
              <div key={contact.id} className={`bg-white border rounded-xl px-5 py-4 ${isOverdue ? "border-red-200" : needsFollowUp ? "border-amber-200" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(needsFollowUp || isOverdue) && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? "bg-red-400" : "bg-amber-400"}`} title="Follow up needed" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500">{contact.company}{contact.relationship ? ` · ${contact.relationship}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setTemplateContext({ contactName: contact.name });
                        setShowTemplates(true);
                      }}
                      className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
                    >
                      <Mail className="w-3 h-3" /> Draft
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                    >
                      <StickyNote className="w-3 h-3" />
                    </button>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {new Date(contact.lastContact).toLocaleDateString()}
                      </p>
                      {isOverdue && (
                        <p className="text-[10px] text-red-600 font-medium flex items-center gap-0.5 justify-end">
                          <Clock className="w-2.5 h-2.5" /> Overdue
                        </p>
                      )}
                      {needsFollowUp && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 justify-end">
                          <Clock className="w-2.5 h-2.5" /> {daysSinceContact}d ago
                        </p>
                      )}
                      {hasScheduledFollowUp && !isOverdue && (
                        <p className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5 justify-end">
                          <Calendar className="w-2.5 h-2.5" /> {new Date(contact.nextFollowUp!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Expanded: follow-up date + notes */}
                {isExpanded && onUpdate && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Follow-up date</label>
                      <input
                        type="date"
                        value={contact.nextFollowUp ? new Date(contact.nextFollowUp).toISOString().slice(0, 10) : ""}
                        onChange={(e) => onUpdate(contact.id, { nextFollowUp: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {contact.nextFollowUp && (
                        <button
                          onClick={() => onUpdate(contact.id, { nextFollowUp: undefined })}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      defaultValue={contact.notes || ""}
                      placeholder="Add notes about this contact..."
                      onBlur={(e) => {
                        if (e.target.value !== (contact.notes || "")) {
                          onUpdate(contact.id, { notes: e.target.value });
                        }
                      }}
                      className="w-full text-xs text-gray-700 px-3 py-2 border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Email template modal */}
      {showTemplates && (
        <EmailTemplateLibrary
          context={templateContext}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

export { NetworkTab };
export default NetworkTab;
