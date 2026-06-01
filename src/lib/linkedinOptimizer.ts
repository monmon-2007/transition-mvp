/**
 * LinkedIn Profile Optimizer
 *
 * Generates actionable suggestions for improving LinkedIn
 * profile during job search. Also includes subscription
 * audit and career pivot analysis.
 */

export type LinkedInSuggestion = {
  id: string;
  section: string;
  title: string;
  suggestion: string;
  example?: string;
  priority: "high" | "medium" | "low";
};

export type SubscriptionItem = {
  id: string;
  name: string;
  category: "streaming" | "software" | "fitness" | "food" | "news" | "professional" | "other";
  monthlyCost: number;
  essential: boolean;
};

export type SubscriptionAudit = {
  items: SubscriptionItem[];
  totalMonthly: number;
  totalAnnual: number;
  potentialSavings: number;
  savingsItems: string[];
  runwayExtensionDays: number;
};

export type CareerPivot = {
  fromRole: string;
  toRole: string;
  transferableSkills: string[];
  gapSkills: string[];
  difficulty: "easy" | "moderate" | "stretch";
  timeEstimate: string;
  reasoning: string;
};

// ── LinkedIn Optimizer ──

export function getLinkedInSuggestions(profile: {
  hasHeadline?: boolean;
  hasAbout?: boolean;
  hasBanner?: boolean;
  hasOpenToWork?: boolean;
  experienceCount?: number;
  hasRecommendations?: boolean;
  lastRole?: string;
  targetRole?: string;
}): LinkedInSuggestion[] {
  const suggestions: LinkedInSuggestion[] = [];

  // Headline
  if (!profile.hasHeadline || profile.hasHeadline) {
    suggestions.push({
      id: "headline",
      section: "Headline",
      title: "Optimize your headline for search",
      suggestion: "Your headline is the #1 factor in LinkedIn search. Include your target role + key skills + value prop. Don't just list your last title.",
      example: profile.targetRole
        ? `${profile.targetRole} | [Key Skill 1] & [Key Skill 2] | Helping [target companies] [achieve outcome]`
        : "Senior Software Engineer | Full-Stack & Cloud Infrastructure | Building scalable systems that drive revenue",
      priority: "high",
    });
  }

  // About section
  suggestions.push({
    id: "about",
    section: "About",
    title: "Write a story, not a resume",
    suggestion: "Your About section should be 3-5 short paragraphs: (1) What you do and the impact you create, (2) Your unique expertise, (3) What you're looking for next. Write in first person. End with a call to action.",
    example: "I build products that people actually want to use. Over the past 8 years, I've...\n\nI'm currently exploring my next role where I can...\n\nLet's connect: [email]",
    priority: "high",
  });

  // Banner
  if (!profile.hasBanner) {
    suggestions.push({
      id: "banner",
      section: "Banner Image",
      title: "Add a custom banner image",
      suggestion: "The default gray banner screams 'I haven't touched my profile.' Use Canva (free) to create a simple banner with your name, expertise area, and a clean design.",
      priority: "medium",
    });
  }

  // Open to Work
  if (!profile.hasOpenToWork) {
    suggestions.push({
      id: "open-to-work",
      section: "Open to Work",
      title: "Turn on 'Open to Work' (recruiter-only mode)",
      suggestion: "Set Open to Work visible to recruiters only (not the green banner). This dramatically increases inbound recruiter messages. Specify your target roles, locations, and work type.",
      priority: "high",
    });
  }

  // Featured section
  suggestions.push({
    id: "featured",
    section: "Featured",
    title: "Pin 2-3 items to your Featured section",
    suggestion: "Feature your best work: a case study, a talk, an article, a portfolio link. This is prime real estate that most people leave empty.",
    priority: "medium",
  });

  // Experience bullets
  suggestions.push({
    id: "experience",
    section: "Experience",
    title: "Rewrite experience with metrics",
    suggestion: "Every bullet should follow: [Action verb] + [What you did] + [Measurable result]. Recruiters scan for numbers — they're proof of impact.",
    example: "Before: 'Managed the migration project'\nAfter: 'Led migration of 2M+ users to new platform, reducing load times by 40% and saving $180K/yr in infrastructure costs'",
    priority: "high",
  });

  // Recommendations
  if (!profile.hasRecommendations) {
    suggestions.push({
      id: "recommendations",
      section: "Recommendations",
      title: "Get 3+ recommendations this week",
      suggestion: "Reach out to 3 former managers or senior colleagues. A specific recommendation ('Sarah built our entire CI/CD pipeline from scratch') beats a generic one ('Great to work with'). Offer to write a draft they can edit.",
      priority: "medium",
    });
  }

  // Skills endorsements
  suggestions.push({
    id: "skills",
    section: "Skills",
    title: "Reorder skills to match your target role",
    suggestion: "LinkedIn shows your top 3 skills prominently. Reorder so the skills most relevant to your target role are first. Remove irrelevant ones. Ask colleagues to endorse your top skills.",
    priority: "low",
  });

  // Activity
  suggestions.push({
    id: "activity",
    section: "Activity",
    title: "Post or engage 2-3x per week",
    suggestion: "Active profiles get 5x more views. You don't need to write essays — comment thoughtfully on others' posts, share an insight from your experience, or repost industry news with your take.",
    priority: "medium",
  });

  return suggestions;
}

// ── Subscription Audit ──

export const COMMON_SUBSCRIPTIONS: { name: string; category: SubscriptionItem["category"]; typicalCost: number; essential: boolean }[] = [
  { name: "Netflix", category: "streaming", typicalCost: 15.49, essential: false },
  { name: "Spotify / Apple Music", category: "streaming", typicalCost: 10.99, essential: false },
  { name: "Hulu", category: "streaming", typicalCost: 17.99, essential: false },
  { name: "Disney+", category: "streaming", typicalCost: 13.99, essential: false },
  { name: "HBO Max", category: "streaming", typicalCost: 15.99, essential: false },
  { name: "YouTube Premium", category: "streaming", typicalCost: 13.99, essential: false },
  { name: "Amazon Prime", category: "other", typicalCost: 14.99, essential: false },
  { name: "Gym membership", category: "fitness", typicalCost: 50.00, essential: false },
  { name: "Peloton / fitness app", category: "fitness", typicalCost: 44.00, essential: false },
  { name: "DoorDash / UberEats subscription", category: "food", typicalCost: 9.99, essential: false },
  { name: "Meal kit (HelloFresh, etc.)", category: "food", typicalCost: 60.00, essential: false },
  { name: "Cloud storage (iCloud, Dropbox)", category: "software", typicalCost: 9.99, essential: false },
  { name: "Adobe Creative Cloud", category: "software", typicalCost: 54.99, essential: false },
  { name: "Microsoft 365", category: "software", typicalCost: 9.99, essential: false },
  { name: "LinkedIn Premium", category: "professional", typicalCost: 29.99, essential: true },
  { name: "News subscription (NYT, WSJ)", category: "news", typicalCost: 17.00, essential: false },
  { name: "VPN service", category: "software", typicalCost: 12.99, essential: false },
  { name: "Gaming (Xbox/PS+/Nintendo)", category: "streaming", typicalCost: 14.99, essential: false },
];

export function auditSubscriptions(
  selectedIds: string[],
  monthlyBurn?: number
): SubscriptionAudit {
  const items = COMMON_SUBSCRIPTIONS
    .filter((_, i) => selectedIds.includes(String(i)))
    .map((s, i) => ({
      id: String(i),
      name: s.name,
      category: s.category,
      monthlyCost: s.typicalCost,
      essential: s.essential,
    }));

  const totalMonthly = items.reduce((sum, i) => sum + i.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;
  const nonEssential = items.filter((i) => !i.essential);
  const potentialSavings = nonEssential.reduce((sum, i) => sum + i.monthlyCost, 0);
  const savingsItems = nonEssential.map((i) => i.name);

  // How many days of runway this savings would add
  const runwayExtensionDays = monthlyBurn && monthlyBurn > 0
    ? Math.round((potentialSavings / monthlyBurn) * 30)
    : 0;

  return {
    items,
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    totalAnnual: Math.round(totalAnnual * 100) / 100,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
    savingsItems,
    runwayExtensionDays,
  };
}

// ── Career Pivot Recommender ──

export const PIVOT_MAP: Record<string, CareerPivot[]> = {
  "software-engineer": [
    {
      fromRole: "Software Engineer",
      toRole: "Technical Product Manager",
      transferableSkills: ["System design thinking", "Technical depth", "Cross-team collaboration", "Sprint planning"],
      gapSkills: ["Market analysis", "Roadmap prioritization", "Stakeholder management"],
      difficulty: "moderate",
      timeEstimate: "2-4 months",
      reasoning: "Engineers who can bridge technical and business thinking are highly valued. Your ability to evaluate technical feasibility is a major advantage over non-technical PMs.",
    },
    {
      fromRole: "Software Engineer",
      toRole: "Solutions Engineer / Sales Engineer",
      transferableSkills: ["Technical expertise", "Problem-solving", "Demo building", "Architecture knowledge"],
      gapSkills: ["Sales process", "Client relationship management", "Presentation skills"],
      difficulty: "easy",
      timeEstimate: "1-2 months",
      reasoning: "High demand, often higher total comp (base + commission). Your technical credibility is the main qualification.",
    },
    {
      fromRole: "Software Engineer",
      toRole: "Developer Relations / DevRel",
      transferableSkills: ["Coding", "Technical writing", "Community engagement", "Open source"],
      gapSkills: ["Public speaking", "Content strategy", "Community building at scale"],
      difficulty: "moderate",
      timeEstimate: "2-3 months",
      reasoning: "If you enjoy teaching, writing, or speaking, DevRel combines engineering with communication.",
    },
  ],
  "product-manager": [
    {
      fromRole: "Product Manager",
      toRole: "Product Marketing Manager",
      transferableSkills: ["Market understanding", "User research", "Messaging", "Go-to-market"],
      gapSkills: ["Campaign execution", "Content creation", "Analytics tools (HubSpot, etc.)"],
      difficulty: "easy",
      timeEstimate: "1-2 months",
      reasoning: "Product marketers who understand the product deeply are rare and valued.",
    },
    {
      fromRole: "Product Manager",
      toRole: "Strategy / Chief of Staff",
      transferableSkills: ["Cross-functional leadership", "Data analysis", "Roadmapping", "Stakeholder management"],
      gapSkills: ["Financial modeling", "Board-level communication", "Operational execution"],
      difficulty: "moderate",
      timeEstimate: "2-3 months",
      reasoning: "Your ability to synthesize complex information and drive alignment translates directly.",
    },
  ],
  "designer": [
    {
      fromRole: "Product Designer",
      toRole: "UX Research",
      transferableSkills: ["User empathy", "Interview techniques", "Wireframing", "Usability testing"],
      gapSkills: ["Quantitative research methods", "Statistical analysis", "Research operations"],
      difficulty: "easy",
      timeEstimate: "1-2 months",
      reasoning: "Designers with research skills are increasingly in demand as companies invest in user insights.",
    },
    {
      fromRole: "Product Designer",
      toRole: "Product Manager",
      transferableSkills: ["User-centered thinking", "Prototyping", "A/B testing", "Design systems"],
      gapSkills: ["Technical architecture", "Revenue metrics", "Roadmap prioritization"],
      difficulty: "moderate",
      timeEstimate: "3-4 months",
      reasoning: "Design-to-PM is a well-trodden path. Your user empathy is your biggest advantage.",
    },
  ],
  "marketing": [
    {
      fromRole: "Marketing",
      toRole: "Customer Success Manager",
      transferableSkills: ["Communication", "Data analysis", "Campaign thinking", "User journey mapping"],
      gapSkills: ["Account management", "Renewal metrics", "Technical troubleshooting"],
      difficulty: "easy",
      timeEstimate: "1-2 months",
      reasoning: "Marketing skills in understanding customer needs and communicating value translate well to CS.",
    },
  ],
  "data-scientist": [
    {
      fromRole: "Data Scientist",
      toRole: "ML Engineer",
      transferableSkills: ["ML algorithms", "Python", "Data pipelines", "Statistical modeling"],
      gapSkills: ["Production ML systems", "MLOps (Kubernetes, CI/CD)", "Software engineering practices"],
      difficulty: "moderate",
      timeEstimate: "2-3 months",
      reasoning: "ML Engineers are in higher demand and command higher salaries. Bridge the gap with production engineering skills.",
    },
    {
      fromRole: "Data Scientist",
      toRole: "Analytics Engineer",
      transferableSkills: ["SQL", "Data modeling", "Statistical analysis", "Business understanding"],
      gapSkills: ["dbt", "Data warehouse design", "DataOps practices"],
      difficulty: "easy",
      timeEstimate: "1-2 months",
      reasoning: "Analytics engineering is booming. Your analytical thinking plus SQL skills are 80% of the requirement.",
    },
  ],
};

export function getCareerPivots(roleCategory: string): CareerPivot[] {
  return PIVOT_MAP[roleCategory] || [];
}
