"use client";
import React, { useState, useEffect } from "react";

interface FeedbackModalProps {
  contextPage?: string;
}

export default function FeedbackModal({ contextPage = "summary" }: FeedbackModalProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Show after 3 seconds, but only once per session
    const alreadySeen = sessionStorage.getItem("feedback_modal_seen");
    if (alreadySeen) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("feedback_modal_seen", "1");
    setVisible(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackText: text.trim(), contextPage }),
      });
      setSubmitted(true);
      sessionStorage.setItem("feedback_modal_seen", "1");
      setTimeout(() => setVisible(false), 2000);
    } catch {
      // Silently ignore — don't block the user
      dismiss();
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/10 p-6 relative">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">Thanks for sharing!</p>
            <p className="text-sm text-gray-500 mt-1">Your feedback helps us improve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Quick question</p>
                <p className="text-xs text-gray-500">Takes 10 seconds</p>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-800 mb-2">
              What's your single biggest blocker right now?
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Not sure whether to sign the severance or negotiate first..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Submit"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
