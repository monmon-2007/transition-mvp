"use client";

import React, { useState } from "react";
import {
  EMAIL_TEMPLATES,
  interpolateTemplate,
  type EmailTemplate,
  type TemplateContext,
} from "@/lib/emailTemplates";
import { Copy, Check, Mail, ChevronDown, X } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  networking: "Networking",
  "follow-up": "Follow-ups",
  interview: "Interview",
  reference: "References",
  outreach: "Recruiter",
};

export default function EmailTemplateLibrary({
  context,
  onClose,
}: {
  context: TemplateContext;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(EMAIL_TEMPLATES.map((t) => t.category))];

  const filteredTemplates = activeCategory
    ? EMAIL_TEMPLATES.filter((t) => t.category === activeCategory)
    : EMAIL_TEMPLATES;

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-violet-500" />
            <h2 className="font-bold text-gray-900">Email Templates</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              !activeCategory ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Template list / preview */}
        <div className="flex-1 overflow-y-auto">
          {selectedTemplate ? (
            <div className="p-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium mb-4"
              >
                ← Back to templates
              </button>
              <h3 className="font-semibold text-gray-900 mb-1">{selectedTemplate.title}</h3>
              {selectedTemplate.subject && (
                <p className="text-xs text-gray-400 mb-3">
                  Subject: {interpolateTemplate(selectedTemplate.subject, context)}
                </p>
              )}
              <textarea
                defaultValue={interpolateTemplate(selectedTemplate.body, context)}
                className="w-full text-sm text-gray-700 font-mono leading-relaxed border border-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{ minHeight: 300 }}
                spellCheck
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const textarea = document.querySelector("textarea");
                    if (textarea) handleCopy(textarea.value);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{template.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {CATEGORY_LABELS[template.category] || template.category}
                        {template.subject ? ` · ${template.subject.slice(0, 40)}...` : ""}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
