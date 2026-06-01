/**
 * Email Template Library
 * Pre-filled templates with {{placeholder}} interpolation.
 */

export type EmailTemplate = {
  id: string;
  category: "networking" | "follow-up" | "interview" | "reference" | "outreach";
  title: string;
  subject: string;
  body: string;
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ── Networking ──
  {
    id: "networking-warm",
    category: "networking",
    title: "Warm reconnection",
    subject: "Quick hello from {{name}}",
    body: `Hi {{contactName}},

I hope you're doing well! I wanted to reach out because I'm currently exploring new opportunities after my time at {{company}}. I've been thinking about roles in {{targetArea}} and immediately thought of you given your experience in this space.

I'd love to catch up briefly if you have 15 minutes. No pressure at all — I'm mainly looking to learn about what's happening in your world and get your perspective.

Would you be open to a quick call or coffee chat sometime this week or next?

Best,
{{name}}`,
  },
  {
    id: "networking-linkedin",
    category: "networking",
    title: "LinkedIn connection request",
    subject: "",
    body: `Hi {{contactName}}, I came across your profile while researching opportunities in {{targetArea}}. I recently left {{company}} where I was a {{role}}, and I'd love to connect and learn from your experience. Hope to stay in touch!`,
  },

  // ── Follow-ups ──
  {
    id: "followup-48h",
    category: "follow-up",
    title: "Application follow-up (48h)",
    subject: "Following up — {{role}} application",
    body: `Hi {{contactName}},

I wanted to quickly follow up on my application for the {{role}} position. I submitted my materials a couple of days ago and I'm very enthusiastic about the opportunity.

I believe my background in {{targetArea}} would be a strong fit for what you're building. I'd welcome the chance to discuss how I can contribute.

Please let me know if there's any additional information I can provide.

Thank you for your time,
{{name}}`,
  },
  {
    id: "followup-1w",
    category: "follow-up",
    title: "Follow-up after 1 week",
    subject: "Checking in — {{role}} at {{targetCompany}}",
    body: `Hi {{contactName}},

I wanted to check in on my application for the {{role}} position. I applied about a week ago and remain very interested in the opportunity.

I understand you're likely reviewing many candidates, so I appreciate your time. If there's anything else I can share — work samples, references, or additional context — I'm happy to provide it.

Looking forward to hearing from you,
{{name}}`,
  },
  {
    id: "followup-2w",
    category: "follow-up",
    title: "Follow-up after 2 weeks",
    subject: "Still interested — {{role}} position",
    body: `Hi {{contactName}},

I hope this finds you well. I'm circling back on my application for the {{role}} position, submitted about two weeks ago. I wanted to reiterate my strong interest in the role and the team.

If the timeline has shifted or the role has been filled, I completely understand — I'd appreciate a quick update when you have a moment.

Thank you,
{{name}}`,
  },

  // ── Interview ──
  {
    id: "interview-thankyou",
    category: "interview",
    title: "Post-interview thank you",
    subject: "Thank you — {{role}} conversation",
    body: `Hi {{contactName}},

Thank you for taking the time to speak with me today about the {{role}} position. I really enjoyed learning more about the team and the challenges you're working on.

Our conversation reinforced my excitement about this opportunity. I was particularly drawn to {{specificTopic}}, and I believe my experience with {{relevantSkill}} would allow me to contribute meaningfully.

Please don't hesitate to reach out if you need any additional information. I look forward to hearing about next steps.

Best regards,
{{name}}`,
  },

  // ── Reference ──
  {
    id: "reference-request",
    category: "reference",
    title: "Request a reference",
    subject: "Would you be a reference for me?",
    body: `Hi {{contactName}},

I hope you're doing well! I'm currently interviewing for a {{role}} position at {{targetCompany}} and they've asked for references.

Given our work together at {{company}}, I was wondering if you'd be willing to serve as a reference? If so, I'd be happy to send you a brief summary of the role so you have context for any questions they might ask.

No pressure at all if the timing doesn't work — I completely understand.

Thank you,
{{name}}`,
  },

  // ── Recruiter outreach ──
  {
    id: "recruiter-response",
    category: "outreach",
    title: "Respond to recruiter",
    subject: "Re: {{role}} opportunity",
    body: `Hi {{contactName}},

Thanks for reaching out about the {{role}} opportunity — it sounds interesting. I'd be happy to learn more.

A bit about me: I was most recently a {{role}} at {{company}}, where I focused on {{targetArea}}. I'm currently exploring my next role and am particularly interested in companies where I can {{goalStatement}}.

Would you have time for a brief call this week to discuss the details?

Best,
{{name}}`,
  },
];

export type TemplateContext = {
  name?: string;
  role?: string;
  company?: string;
  targetArea?: string;
  contactName?: string;
  targetCompany?: string;
  specificTopic?: string;
  relevantSkill?: string;
  goalStatement?: string;
};

export function interpolateTemplate(
  template: string,
  context: TemplateContext,
): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    if (value) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }
  return result;
}

export function getTemplatesByCategory(category: EmailTemplate["category"]): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter((t) => t.category === category);
}
