"use client";

import React, { useState } from "react";
import { X, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

type NegotiationScenario = {
  id: string;
  title: string;
  description: string;
  template: string;
  tips: string[];
};

const SCENARIOS: NegotiationScenario[] = [
  {
    id: "counter-base",
    title: "Counter on Base Salary",
    description: "You received an offer but want to negotiate a higher base salary.",
    template: `Dear [Hiring Manager],

Thank you so much for the offer to join [Company] as [Role]. I'm genuinely excited about this opportunity and the team.

After careful consideration, I'd like to discuss the base salary component. Based on my research of market rates for this role and level, and considering my [X years] of experience in [relevant area], I was hoping we could explore a base salary in the range of $[target amount].

I'm confident in the value I can bring to the team, particularly in [specific area where you can contribute]. I'm very interested in making this work and am open to discussing other components of the package as well.

Looking forward to your thoughts.

Best regards,
[Your Name]`,
    tips: [
      "Always negotiate after receiving a written offer, never before",
      "Aim 10-20% above the offered amount — anchor high but reasonable",
      "Lead with enthusiasm before the ask",
      "Cite market data (Levels.fyi, Glassdoor, Blind) for leverage",
      "Never give an ultimatum unless you're prepared to walk away",
    ],
  },
  {
    id: "counter-equity",
    title: "Negotiate Equity/RSU",
    description: "Push for more equity while keeping the base salary.",
    template: `Dear [Hiring Manager],

Thank you for the generous offer. I'm thrilled about the opportunity to contribute to [Company]'s mission.

I'm comfortable with the base salary, but I'd like to discuss the equity component. Given my [experience/skills], I believe a grant of [target shares/value] would better reflect the long-term value I plan to bring to the team.

I'm particularly excited about [Company]'s trajectory in [area], and I want my compensation to reflect my commitment to the company's long-term success.

Would you be open to exploring this?

Best,
[Your Name]`,
    tips: [
      "Equity is often more negotiable than base salary",
      "Ask about vesting schedule, cliff, and refresh grants",
      "For public companies, calculate total comp using current stock price",
      "For startups, ask about preferred share price and last 409A valuation",
      "Consider negotiating signing bonus if equity is firm",
    ],
  },
  {
    id: "multiple-offers",
    title: "Leverage Multiple Offers",
    description: "You have competing offers and want to use them professionally.",
    template: `Dear [Hiring Manager],

Thank you again for the offer. I want to be transparent — I'm currently evaluating another opportunity as well.

[Company] remains my top choice because of [specific reasons]. However, the competing offer is at $[amount/level], which has given me some things to consider.

I'd love to find a way to make this work. Would there be flexibility to adjust the [base/equity/signing bonus] to $[target]? I'm confident this would allow me to accept without hesitation.

I appreciate your understanding and look forward to hearing from you.

Best regards,
[Your Name]`,
    tips: [
      "Never bluff about a competing offer — it can backfire badly",
      "Be specific about what you need to say yes, don't leave it open-ended",
      "Give a reasonable deadline (3-5 business days)",
      "Express genuine preference for this company if it's true",
      "Don't share the competing company's name unless asked directly",
    ],
  },
  {
    id: "signing-bonus",
    title: "Request Signing Bonus",
    description: "Ask for a signing bonus to bridge the gap.",
    template: `Dear [Hiring Manager],

I'm very excited about joining [Company] and I appreciate the offer.

One consideration is that by leaving my current role, I'll be forfeiting [unvested equity/bonus/etc.] valued at approximately $[amount]. A signing bonus of $[target] would help bridge this gap and make the transition smoother.

I'm very committed to making an impact at [Company] and hope we can work something out.

Best,
[Your Name]`,
    tips: [
      "Signing bonuses are often easier to approve than base increases (one-time cost)",
      "Quantify what you're leaving behind — unvested stock, pending bonus, PTO balance",
      "Signing bonuses may have a clawback clause (1-2 years) — read the fine print",
      "If they can't do cash, ask about relocation assistance or start date flexibility",
    ],
  },
];

const TIMING_ADVICE = [
  { phase: "Receive offer", timing: "Day 0", action: "Express enthusiasm. Ask for the full written offer. Do NOT negotiate yet." },
  { phase: "Review", timing: "Day 1-2", action: "Research market comp. Prepare your counter. Talk to mentors." },
  { phase: "Counter", timing: "Day 2-3", action: "Send your counter via email (creates a paper trail). Be specific." },
  { phase: "Discussion", timing: "Day 3-5", action: "Expect a call. Stay calm, restate your value. Don't accept on the spot." },
  { phase: "Decision", timing: "Day 5-7", action: "Review final offer. Get it in writing. Sign and celebrate." },
];

export default function OfferNegotiationGuide({ onClose }: { onClose: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyTemplate(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Offer Negotiation Playbook</h3>
          <p className="text-sm text-gray-500 mt-0.5">Templates, timing, and strategy for negotiating your offer</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Timing guide */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Negotiation Timeline</h4>
        <div className="flex flex-col gap-2">
          {TIMING_ADVICE.map((step, i) => (
            <div key={i} className="flex gap-3 text-xs">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {i < TIMING_ADVICE.length - 1 && <div className="w-px h-full bg-violet-200 my-1" />}
              </div>
              <div className="pb-3">
                <p className="font-semibold text-gray-900">{step.phase} <span className="font-normal text-gray-400">({step.timing})</span></p>
                <p className="text-gray-600 mt-0.5">{step.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario templates */}
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Counter-Offer Templates</h4>
      <div className="space-y-2">
        {SCENARIOS.map((scenario) => {
          const isExpanded = expandedId === scenario.id;
          return (
            <div key={scenario.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{scenario.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{scenario.description}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 relative">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 font-sans leading-relaxed">
                      {scenario.template}
                    </pre>
                    <button
                      onClick={() => copyTemplate(scenario.id, scenario.template)}
                      className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      {copiedId === scenario.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Pro tips:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {scenario.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-violet-500 flex-shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
