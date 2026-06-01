/**
 * Interview Preparation Engine
 *
 * Generates role-specific interview questions from JD + resume data.
 * Provides STAR method answer scaffolding.
 */

export type InterviewQuestion = {
  id: string;
  question: string;
  category: "behavioral" | "technical" | "situational" | "role-specific";
  why: string;               // why this question is likely
  starPrompt?: StarPrompt;   // STAR scaffolding for behavioral
};

export type StarPrompt = {
  situation: string;
  task: string;
  action: string;
  result: string;
};

export type StarAnswer = {
  questionId: string;
  situation: string;
  task: string;
  action: string;
  result: string;
};

// ── Common behavioral questions by theme ──
const BEHAVIORAL_BANK: { theme: string; questions: string[]; starHint: StarPrompt }[] = [
  {
    theme: "leadership",
    questions: [
      "Tell me about a time you had to lead a team through a difficult situation.",
      "Describe a time you had to influence someone without direct authority.",
      "Give an example of when you had to make a tough decision with incomplete information.",
    ],
    starHint: {
      situation: "What was the context? Who was involved?",
      task: "What was your specific responsibility or goal?",
      action: "What steps did you take? Be specific about YOUR actions.",
      result: "What was the outcome? Use numbers if possible.",
    },
  },
  {
    theme: "conflict",
    questions: [
      "Tell me about a time you disagreed with a colleague or manager. How did you handle it?",
      "Describe a situation where you received critical feedback. What did you do?",
      "Give an example of navigating a disagreement about technical direction.",
    ],
    starHint: {
      situation: "What was the disagreement about? Who was involved?",
      task: "What needed to be resolved? What were the stakes?",
      action: "How did you approach the conversation? What did you propose?",
      result: "What was the resolution? What did you learn?",
    },
  },
  {
    theme: "achievement",
    questions: [
      "What's your most significant professional achievement?",
      "Tell me about a project that exceeded expectations.",
      "Describe a time you improved a process or system significantly.",
    ],
    starHint: {
      situation: "What was the starting state? What problem existed?",
      task: "What were you trying to accomplish?",
      action: "What was your approach? What was innovative about it?",
      result: "What was the measurable impact? Revenue, time saved, etc.",
    },
  },
  {
    theme: "failure",
    questions: [
      "Tell me about a time you failed or made a significant mistake.",
      "Describe a project that didn't go as planned. What did you learn?",
      "Give an example of when you had to pivot your approach mid-project.",
    ],
    starHint: {
      situation: "What was the context? No need to sugar-coat.",
      task: "What were you trying to achieve?",
      action: "What went wrong? What did you do to address it?",
      result: "What did you learn? How did it change your approach?",
    },
  },
  {
    theme: "collaboration",
    questions: [
      "Tell me about a time you worked with a cross-functional team.",
      "Describe how you've built relationships with stakeholders.",
      "Give an example of when you had to get buy-in for an idea.",
    ],
    starHint: {
      situation: "Who were the stakeholders? What was the dynamic?",
      task: "What needed to happen? Why was collaboration critical?",
      action: "How did you build alignment? What communication strategies?",
      result: "What was the outcome of the collaboration?",
    },
  },
];

// ── Role-specific question patterns ──
const ROLE_QUESTIONS: Record<string, string[]> = {
  engineering: [
    "Walk me through the architecture of a system you designed.",
    "How do you approach debugging a production issue?",
    "Tell me about a time you had to make a trade-off between speed and quality.",
    "How do you stay current with technology trends?",
    "Describe your approach to code reviews.",
  ],
  product: [
    "How do you prioritize features when everything seems important?",
    "Walk me through how you'd define success metrics for a new feature.",
    "Tell me about a time you had to say no to a stakeholder.",
    "How do you incorporate user research into your decisions?",
    "Describe a product you shipped that you're proud of.",
  ],
  design: [
    "Walk me through your design process from research to delivery.",
    "How do you handle feedback that contradicts your design instincts?",
    "Tell me about a time you advocated for the user against business pressure.",
    "How do you measure the success of a design?",
  ],
  data: [
    "How do you approach a new dataset you've never seen before?",
    "Tell me about a time your analysis changed a business decision.",
    "How do you communicate technical findings to non-technical stakeholders?",
    "Describe your approach to ensuring data quality.",
  ],
  marketing: [
    "Tell me about a campaign that exceeded expectations. What made it work?",
    "How do you measure ROI on marketing initiatives?",
    "Describe a time you had to pivot a marketing strategy based on data.",
  ],
  sales: [
    "Walk me through your approach to a complex enterprise deal.",
    "Tell me about a deal you lost. What did you learn?",
    "How do you build pipeline in a new territory?",
  ],
  management: [
    "How do you build a high-performing team?",
    "Tell me about a time you had to manage someone out.",
    "How do you balance strategic work with operational demands?",
    "Describe your approach to giving difficult feedback.",
  ],
};

// ── Situational questions from JD keywords ──
function generateSituationalFromJD(jdText: string): string[] {
  const questions: string[] = [];
  const jd = jdText.toLowerCase();

  if (jd.includes("fast-paced") || jd.includes("startup") || jd.includes("ambiguity")) {
    questions.push("How do you handle ambiguity and rapidly changing priorities?");
  }
  if (jd.includes("remote") || jd.includes("distributed")) {
    questions.push("How do you stay productive and connected on a remote/distributed team?");
  }
  if (jd.includes("scale") || jd.includes("growth")) {
    questions.push("Tell me about a time you had to scale a process or system for growth.");
  }
  if (jd.includes("customer") || jd.includes("client")) {
    questions.push("Describe a time you turned a negative customer experience into a positive one.");
  }
  if (jd.includes("data-driven") || jd.includes("metrics")) {
    questions.push("How do you use data to inform your decisions? Give a specific example.");
  }
  if (jd.includes("mentor") || jd.includes("coach") || jd.includes("develop")) {
    questions.push("Tell me about someone you've mentored. What was your approach?");
  }
  if (jd.includes("cross-functional") || jd.includes("collaborate")) {
    questions.push("How do you navigate competing priorities across different teams?");
  }
  if (jd.includes("deadline") || jd.includes("pressure") || jd.includes("tight timeline")) {
    questions.push("Tell me about delivering under a tight deadline. How did you manage it?");
  }

  return questions;
}

function inferRoleCategory(roleTitle: string): string {
  const t = roleTitle.toLowerCase();
  if (t.includes("engineer") || t.includes("developer") || t.includes("swe") || t.includes("architect")) return "engineering";
  if (t.includes("product") || t.includes("pm")) return "product";
  if (t.includes("design") || t.includes("ux") || t.includes("ui")) return "design";
  if (t.includes("data") || t.includes("analyst") || t.includes("scientist")) return "data";
  if (t.includes("market")) return "marketing";
  if (t.includes("sales") || t.includes("account")) return "sales";
  if (t.includes("manager") || t.includes("director") || t.includes("vp") || t.includes("head")) return "management";
  return "engineering"; // default
}

/**
 * Generate a set of interview prep questions from a JD and optional resume context.
 */
export function generateInterviewQuestions(params: {
  jobDescription: string;
  roleTitle: string;
  resumeGaps?: string[];  // missing keywords from JD match
}): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const category = inferRoleCategory(params.roleTitle);
  let qId = 0;

  // 1. Behavioral questions (pick 3 themes)
  const themes = BEHAVIORAL_BANK.sort(() => Math.random() - 0.5).slice(0, 3);
  for (const theme of themes) {
    const q = theme.questions[Math.floor(Math.random() * theme.questions.length)];
    questions.push({
      id: `q-${++qId}`,
      question: q,
      category: "behavioral",
      why: `Common ${theme.theme} question — interviewers want to see how you handle real situations.`,
      starPrompt: theme.starHint,
    });
  }

  // 2. Role-specific questions (pick 2-3)
  const roleQs = ROLE_QUESTIONS[category] || ROLE_QUESTIONS.engineering;
  const selectedRole = roleQs.sort(() => Math.random() - 0.5).slice(0, 3);
  for (const q of selectedRole) {
    questions.push({
      id: `q-${++qId}`,
      question: q,
      category: "role-specific",
      why: `Relevant to ${category} roles — shows domain depth.`,
    });
  }

  // 3. Situational from JD keywords (pick up to 2)
  const situational = generateSituationalFromJD(params.jobDescription).slice(0, 2);
  for (const q of situational) {
    questions.push({
      id: `q-${++qId}`,
      question: q,
      category: "situational",
      why: "This question maps directly to something mentioned in the job description.",
    });
  }

  // 4. Gap-based questions (if resume gaps provided)
  if (params.resumeGaps && params.resumeGaps.length > 0) {
    const topGaps = params.resumeGaps.slice(0, 3);
    for (const gap of topGaps) {
      questions.push({
        id: `q-${++qId}`,
        question: `The JD mentions "${gap}" — can you describe your experience with this?`,
        category: "technical",
        why: `"${gap}" appears in the JD but wasn't found in your resume. They'll likely probe this.`,
      });
    }
  }

  return questions;
}

/** Default STAR prompt for non-behavioral questions */
export const DEFAULT_STAR: StarPrompt = {
  situation: "Set the scene. What was the context?",
  task: "What was your responsibility or objective?",
  action: "What specific steps did YOU take?",
  result: "What was the outcome? Quantify if possible.",
};
