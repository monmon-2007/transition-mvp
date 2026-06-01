/**
 * Legal Rights Expander
 *
 * Wrongful termination risk assessment, non-compete enforceability,
 * PTO/paycheck calculator, and WARN Act checker.
 * NOT legal advice — informational only.
 */

// ── Wrongful Termination Red Flags ──

export type RedFlagQuestion = {
  id: string;
  question: string;
  explanation: string;
  weight: number; // 1-3, higher = more concerning
};

export type WrongfulTermAssessment = {
  score: number; // 0-100
  level: "low" | "moderate" | "high";
  flaggedItems: string[];
  recommendation: string;
};

export const WRONGFUL_TERM_QUESTIONS: RedFlagQuestion[] = [
  {
    id: "protected-class",
    question: "Are you a member of a protected class (age 40+, race, gender, religion, disability, pregnancy, national origin)?",
    explanation: "Federal and state laws prohibit termination based on protected characteristics.",
    weight: 2,
  },
  {
    id: "recent-complaint",
    question: "Did you file a complaint (HR, EEOC, safety, harassment) in the last 12 months?",
    explanation: "Retaliation for protected complaints is illegal, even if the original complaint didn't go anywhere.",
    weight: 3,
  },
  {
    id: "fmla-leave",
    question: "Did you recently take or request FMLA leave, disability accommodation, or medical leave?",
    explanation: "Terminating someone for exercising FMLA rights or requesting ADA accommodation is unlawful.",
    weight: 3,
  },
  {
    id: "whistleblower",
    question: "Did you report illegal activity, safety violations, or regulatory issues?",
    explanation: "Whistleblower protections exist at federal and state levels.",
    weight: 3,
  },
  {
    id: "performance-inconsistency",
    question: "Were you recently given positive reviews or a promotion, then suddenly terminated?",
    explanation: "A rapid shift from positive reviews to termination can suggest pretext.",
    weight: 2,
  },
  {
    id: "different-treatment",
    question: "Were other employees in similar situations (same performance, same role) treated differently?",
    explanation: "Disparate treatment of similarly situated employees can indicate discrimination.",
    weight: 2,
  },
  {
    id: "contract-breach",
    question: "Did you have an employment contract or offer letter with termination terms that weren't followed?",
    explanation: "If your contract specifies 'for cause only' or notice requirements, breach may be actionable.",
    weight: 2,
  },
  {
    id: "verbal-promises",
    question: "Were you given verbal assurances about job security (e.g., 'You'll always have a place here')?",
    explanation: "In some states, verbal promises can create an implied contract.",
    weight: 1,
  },
  {
    id: "timing-suspicious",
    question: "Does the timing seem suspicious? (e.g., right after you turned 40, announced pregnancy, filed a claim)",
    explanation: "Suspicious timing doesn't prove causation, but it strengthens a pattern.",
    weight: 2,
  },
  {
    id: "documentation-lacking",
    question: "Was there little or no documentation of performance issues before termination?",
    explanation: "Lack of a paper trail makes a 'performance' justification weaker.",
    weight: 1,
  },
];

export function assessWrongfulTermination(answeredYes: string[]): WrongfulTermAssessment {
  let totalWeight = 0;
  const flaggedItems: string[] = [];

  for (const q of WRONGFUL_TERM_QUESTIONS) {
    if (answeredYes.includes(q.id)) {
      totalWeight += q.weight;
      flaggedItems.push(q.question);
    }
  }

  const maxWeight = WRONGFUL_TERM_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
  const score = Math.round((totalWeight / maxWeight) * 100);

  let level: WrongfulTermAssessment["level"];
  let recommendation: string;

  if (score >= 40) {
    level = "high";
    recommendation = "Multiple red flags suggest you should consult an employment attorney. Many offer free consultations. Document everything — emails, texts, dates, and witnesses. Time limits apply to most claims (180-300 days for EEOC).";
  } else if (score >= 20) {
    level = "moderate";
    recommendation = "Some concerning factors are present. It may be worth a free consultation with an employment attorney to discuss your specific situation. Keep all documentation from your employer.";
  } else {
    level = "low";
    recommendation = "Based on your answers, there aren't strong indicators of wrongful termination. However, if you feel something was unfair, trust your instincts — a brief attorney consultation can provide clarity.";
  }

  return { score, level, flaggedItems, recommendation };
}

// ── Non-Compete Enforceability by State ──

export type NonCompeteInfo = {
  state: string;
  enforceability: "banned" | "very-limited" | "limited" | "enforceable" | "strongly-enforceable";
  summary: string;
  keyFacts: string[];
};

export const NON_COMPETE_BY_STATE: Record<string, NonCompeteInfo> = {
  CA: {
    state: "California",
    enforceability: "banned",
    summary: "California broadly bans non-competes for employees. Your non-compete is almost certainly void.",
    keyFacts: [
      "Non-competes are void under Cal. Bus. & Prof. Code § 16600.",
      "Even if you signed one, it's unenforceable in CA.",
      "Employers cannot threaten enforcement as a negotiation tactic.",
      "As of 2024, employers must notify current and former employees that their non-competes are void.",
    ],
  },
  CO: {
    state: "Colorado",
    enforceability: "very-limited",
    summary: "Colorado bans non-competes for most workers earning under ~$112K (2024).",
    keyFacts: [
      "Banned for workers earning below the threshold (~$112K/yr adjusted annually).",
      "Permitted only for 'highly compensated' workers, with limitations.",
      "Non-solicitation of customers may still be enforceable.",
      "Employer must give notice of the non-compete at hiring.",
    ],
  },
  MN: {
    state: "Minnesota",
    enforceability: "banned",
    summary: "Minnesota banned non-competes effective July 1, 2023.",
    keyFacts: [
      "Non-competes signed after July 1, 2023 are void.",
      "Pre-existing non-competes may still be enforceable.",
      "Non-solicitation agreements are still permitted.",
    ],
  },
  NY: {
    state: "New York",
    enforceability: "limited",
    summary: "NY enforces non-competes but courts apply strict reasonableness tests.",
    keyFacts: [
      "Must be reasonable in scope, geography, and duration.",
      "Courts frequently narrow or void overbroad non-competes.",
      "Laid-off employees have a stronger argument against enforcement.",
      "Typical enforceable duration: 6-12 months maximum.",
    ],
  },
  TX: {
    state: "Texas",
    enforceability: "enforceable",
    summary: "Texas generally enforces non-competes if they meet statutory requirements.",
    keyFacts: [
      "Must be part of an otherwise enforceable agreement (consideration required).",
      "Must be reasonable in time, geography, and scope.",
      "Courts can reform (narrow) overbroad restrictions rather than void them.",
      "At-will employees can still be bound if adequate consideration exists.",
    ],
  },
  WA: {
    state: "Washington",
    enforceability: "very-limited",
    summary: "Washington restricts non-competes to high earners ($116K+ employees, $291K+ contractors in 2024).",
    keyFacts: [
      "Void for employees earning under ~$116K/yr.",
      "Maximum duration: 18 months.",
      "Employer must disclose at or before acceptance of employment.",
      "If laid off, employer must pay garden leave (compensation during restriction).",
    ],
  },
  IL: {
    state: "Illinois",
    enforceability: "limited",
    summary: "Illinois bans non-competes for workers earning under $75K (increasing to $90K by 2027).",
    keyFacts: [
      "Income threshold increases annually through 2027.",
      "Employer must advise employee to consult an attorney (14-day review period).",
      "Must provide adequate consideration beyond continued employment.",
      "Not enforceable against employees terminated without cause in many cases.",
    ],
  },
  MA: {
    state: "Massachusetts",
    enforceability: "limited",
    summary: "MA limits non-competes to 12 months and requires garden leave or consideration.",
    keyFacts: [
      "Maximum 12-month duration.",
      "Employer must pay garden leave (50% of base salary) during restriction.",
      "Cannot be imposed on non-exempt employees, interns, or laid-off workers.",
      "Must be provided at time of offer or 10 days before start.",
    ],
  },
  FL: {
    state: "Florida",
    enforceability: "strongly-enforceable",
    summary: "Florida has some of the most employer-friendly non-compete laws in the country.",
    keyFacts: [
      "Statutory presumption of reasonableness for restrictions under 6 months.",
      "Courts generally enforce as written if reasonable.",
      "Burden on employee to prove unreasonableness.",
      "Non-competes survive termination regardless of cause.",
    ],
  },
  GA: {
    state: "Georgia",
    enforceability: "enforceable",
    summary: "Georgia enforces non-competes under a 2011 constitutional amendment.",
    keyFacts: [
      "Must be reasonable in time, territory, and scope.",
      "Courts can modify (blue-pencil) overbroad restrictions.",
      "Must protect a legitimate business interest.",
      "Generally limited to 2 years.",
    ],
  },
};

// Default for states not specifically listed
const DEFAULT_NON_COMPETE: NonCompeteInfo = {
  state: "Other",
  enforceability: "enforceable",
  summary: "Most states enforce non-competes if reasonable in scope, duration, and geography. Consult a local attorney.",
  keyFacts: [
    "Reasonableness is evaluated by courts on a case-by-case basis.",
    "Being laid off (vs. quitting or fired for cause) can weaken enforcement.",
    "Non-competes exceeding 2 years are harder to enforce.",
    "Courts look at whether the restriction protects a legitimate business interest.",
  ],
};

export function getNonCompeteInfo(stateCode: string): NonCompeteInfo {
  return NON_COMPETE_BY_STATE[stateCode.toUpperCase()] || {
    ...DEFAULT_NON_COMPETE,
    state: stateCode,
  };
}

// ── PTO Payout Calculator ──

export type PTOPayoutResult = {
  dailyRate: number;
  totalPayout: number;
  isRequired: boolean;
  stateNote: string;
};

// States that require PTO payout at termination
const PTO_PAYOUT_REQUIRED: Record<string, string> = {
  CA: "California requires payout of all accrued, unused PTO at termination.",
  CO: "Colorado requires payout of earned vacation at separation.",
  IL: "Illinois requires payout of earned vacation time.",
  MA: "Massachusetts requires payout of accrued vacation.",
  MT: "Montana requires payout of accrued vacation.",
  NE: "Nebraska requires payout of accrued vacation unless policy says otherwise.",
  ND: "North Dakota requires payout if employed 1+ year.",
  OR: "Oregon requires payout per employer policy; if policy is silent, payout may be required.",
  WY: "Wyoming requires payout of earned vacation.",
  DC: "DC requires payout of accrued vacation.",
  NY: "New York requires payout unless a written policy clearly says otherwise.",
  LA: "Louisiana requires payout of accrued vacation.",
};

export function calculatePTOPayout(
  annualSalary: number,
  unusedDays: number,
  stateCode: string
): PTOPayoutResult {
  const dailyRate = Math.round(annualSalary / 260); // 260 working days
  const totalPayout = dailyRate * unusedDays;
  const upperState = stateCode.toUpperCase();
  const isRequired = upperState in PTO_PAYOUT_REQUIRED;
  const stateNote = isRequired
    ? PTO_PAYOUT_REQUIRED[upperState]
    : "Your state doesn't mandate PTO payout, but check your employer's written policy — many still pay it out.";

  return { dailyRate, totalPayout, isRequired, stateNote };
}

// ── WARN Act Checker ──

export type WARNResult = {
  likelyApplies: boolean;
  explanation: string;
  requirements: string[];
  actionItems: string[];
};

export function checkWARNAct(
  companySize: number,
  layoffCount: number,
  noticeDaysGiven: number
): WARNResult {
  // Federal WARN Act applies to employers with 100+ employees
  // Triggered by layoffs of 50+ employees at a single site, or 500+ total
  const federalApplies = companySize >= 100 && (layoffCount >= 50 || layoffCount >= 500);
  // Mini-WARN: some states have lower thresholds (e.g., CA: 75 employees)
  const miniWARNPossible = companySize >= 75 && layoffCount >= 25;

  if (!federalApplies && !miniWARNPossible) {
    return {
      likelyApplies: false,
      explanation: "Based on the numbers provided, the federal WARN Act likely doesn't apply. Some states have lower thresholds — check your state's mini-WARN law.",
      requirements: [],
      actionItems: [
        "Check if your state has a mini-WARN Act with lower thresholds.",
        "Ask HR in writing how many people were laid off. Get the number documented.",
      ],
    };
  }

  const noticeSufficient = noticeDaysGiven >= 60;
  const requirements = [
    "60 days written notice before mass layoff or plant closing.",
    "Notice must go to: affected employees, state dislocated worker unit, and local government.",
    "Failure to provide notice entitles employees to back pay and benefits for each violation day (up to 60 days).",
  ];

  if (noticeSufficient) {
    return {
      likelyApplies: true,
      explanation: "The WARN Act likely applies, and it appears your employer provided the required 60 days notice.",
      requirements,
      actionItems: [
        "Verify you received written notice (not just verbal) at least 60 days before your termination date.",
        "Check that the notice was specific — it should state the expected date of layoff.",
      ],
    };
  }

  return {
    likelyApplies: true,
    explanation: `The WARN Act likely applies, and ${noticeDaysGiven} days notice may be insufficient. You may be entitled to back pay for the gap between notice given and 60 days.`,
    requirements,
    actionItems: [
      `You received ${noticeDaysGiven} days notice — WARN requires 60. The gap is ${60 - noticeDaysGiven} days.`,
      `Potential back pay owed: ${60 - noticeDaysGiven} days of wages + benefits.`,
      "Document: when you received notice, what form it took, and your termination date.",
      "File a complaint with your state's Department of Labor or consult an employment attorney.",
      "You can also file a WARN Act lawsuit directly in federal court.",
    ],
  };
}
