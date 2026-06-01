/**
 * Emotional Journey Support
 *
 * Grief stage awareness, journaling prompts, wins tracking,
 * and mindfulness exercises for career transition.
 */

export type GriefStage = "shock" | "anger" | "bargaining" | "sadness" | "acceptance";

export type GriefStageInfo = {
  id: GriefStage;
  label: string;
  description: string;
  normalizations: string[];
  tips: string[];
};

export type JournalPrompt = {
  id: string;
  prompt: string;
  category: "reflection" | "gratitude" | "future" | "processing";
};

export type Win = {
  id: string;
  text: string;
  date: string;
  category: "application" | "interview" | "network" | "skill" | "personal" | "other";
};

export type MindfulnessExercise = {
  id: string;
  title: string;
  duration: string;
  steps: string[];
  context: "pre-interview" | "anxiety" | "motivation" | "general";
};

// ── Grief Stage Data ──

export const GRIEF_STAGES: GriefStageInfo[] = [
  {
    id: "shock",
    label: "Shock & Denial",
    description: "This doesn't feel real yet. You may feel numb, disoriented, or in autopilot mode.",
    normalizations: [
      "Feeling numb or disconnected is your brain's way of protecting you.",
      "It's normal to wake up forgetting what happened for a moment.",
      "You don't have to have a plan right now. Stability comes first.",
    ],
    tips: [
      "Don't make big decisions this week — give yourself time to process.",
      "Tell 2-3 trusted people. You don't have to do this alone.",
      "Focus only on immediate practical needs: finances, benefits, health insurance.",
    ],
  },
  {
    id: "anger",
    label: "Anger & Frustration",
    description: "You might feel rage at the company, your manager, or the unfairness of it all. This is healthy.",
    normalizations: [
      "Anger means you're engaged with reality — that's progress.",
      "It's okay to be furious. The situation was unfair.",
      "Your feelings about this are valid, regardless of the 'business reasons' they gave.",
    ],
    tips: [
      "Channel anger into action: review your severance, file for unemployment.",
      "Write an unsent letter to whoever you're angry at. Get it out of your head.",
      "Exercise helps — even a 20-minute walk changes your brain chemistry.",
    ],
  },
  {
    id: "bargaining",
    label: "What-Ifs & Self-Doubt",
    description: "You're replaying scenarios. 'What if I'd done X differently?' This is your mind trying to regain control.",
    normalizations: [
      "Layoffs are almost never about individual performance. It was a business decision.",
      "The 'what-ifs' are your brain's attempt to find a reason — but sometimes there isn't one you could have controlled.",
      "Second-guessing yourself is temporary. It doesn't reflect your actual abilities.",
    ],
    tips: [
      "Write down 3 things you did well at your last job. Read them when the doubts come.",
      "Talk to a former colleague who can remind you of your strengths.",
      "Focus on what you can control now, not what you can't change about the past.",
    ],
  },
  {
    id: "sadness",
    label: "Sadness & Low Energy",
    description: "The loss is sinking in — the routine, the people, the identity. It's okay to grieve.",
    normalizations: [
      "A job is more than a paycheck — it's community, purpose, and routine. Losing all three at once is legitimately hard.",
      "Low energy and motivation dips are normal. They're not permanent.",
      "You don't have to be productive every day. Some days, getting through is enough.",
    ],
    tips: [
      "Maintain one daily anchor: a morning walk, coffee at the same time, a workout.",
      "Limit job search to set hours. Don't let it consume every waking moment.",
      "Consider talking to a therapist — many offer sliding scale rates during unemployment.",
    ],
  },
  {
    id: "acceptance",
    label: "Acceptance & Forward Motion",
    description: "You're integrating what happened. Not 'over it' — but ready to build what's next.",
    normalizations: [
      "Acceptance doesn't mean you're happy about it. It means you've stopped fighting the reality.",
      "Many people look back on their layoff as a turning point — not because it was good, but because of what they built after.",
      "The fact that you're here, working on your next chapter, says everything about your resilience.",
    ],
    tips: [
      "Now is a great time to ask: what do I actually want, not just what I had?",
      "Set a weekly rhythm: applications, networking, skill-building, and rest.",
      "Celebrate small wins — every step forward counts.",
    ],
  },
];

/**
 * Estimate grief stage from weeks since layoff.
 * This is a rough heuristic — everyone's timeline is different.
 */
export function estimateGriefStage(weeksSinceLayoff: number): GriefStage {
  if (weeksSinceLayoff <= 1) return "shock";
  if (weeksSinceLayoff <= 3) return "anger";
  if (weeksSinceLayoff <= 5) return "bargaining";
  if (weeksSinceLayoff <= 8) return "sadness";
  return "acceptance";
}

// ── Journal Prompts ──

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  // Reflection
  { id: "ref-1", prompt: "What am I feeling right now? No judgment — just name it.", category: "reflection" },
  { id: "ref-2", prompt: "What's one thing I learned at my last job that I'm proud of?", category: "reflection" },
  { id: "ref-3", prompt: "If I could design my ideal workday, what would it look like?", category: "reflection" },
  { id: "ref-4", prompt: "What parts of my last role energized me? What drained me?", category: "reflection" },
  { id: "ref-5", prompt: "What would I tell a friend going through the same thing?", category: "reflection" },

  // Gratitude
  { id: "grat-1", prompt: "Name 3 people who have supported you this week, even in small ways.", category: "gratitude" },
  { id: "grat-2", prompt: "What's one skill you have that you're grateful for?", category: "gratitude" },
  { id: "grat-3", prompt: "What's something good that happened today, no matter how small?", category: "gratitude" },

  // Future
  { id: "fut-1", prompt: "What kind of team culture would make me excited to go to work?", category: "future" },
  { id: "fut-2", prompt: "If money weren't a factor, what work would I choose?", category: "future" },
  { id: "fut-3", prompt: "What's one thing I want to be doing differently 6 months from now?", category: "future" },
  { id: "fut-4", prompt: "What would a career win look like for me this year?", category: "future" },

  // Processing
  { id: "proc-1", prompt: "What am I most afraid of right now? What would I do if that fear came true?", category: "processing" },
  { id: "proc-2", prompt: "What story am I telling myself about why this happened? Is it true?", category: "processing" },
  { id: "proc-3", prompt: "What do I need to let go of to move forward?", category: "processing" },
  { id: "proc-4", prompt: "When have I faced uncertainty before? What got me through?", category: "processing" },
];

/**
 * Get a daily journal prompt based on day of year and grief stage.
 */
export function getDailyPrompt(daysSinceLayoff: number, griefStage: GriefStage): JournalPrompt {
  // Weight prompts by stage
  const preferred: JournalPrompt["category"][] =
    griefStage === "shock" || griefStage === "anger" ? ["processing", "reflection"] :
    griefStage === "bargaining" || griefStage === "sadness" ? ["reflection", "gratitude"] :
    ["future", "gratitude"];

  const weightedPrompts = JOURNAL_PROMPTS.filter((p) => preferred.includes(p.category));
  const pool = weightedPrompts.length > 0 ? weightedPrompts : JOURNAL_PROMPTS;

  // Deterministic daily rotation
  const index = daysSinceLayoff % pool.length;
  return pool[index];
}

// ── Mindfulness Exercises ──

export const MINDFULNESS_EXERCISES: MindfulnessExercise[] = [
  {
    id: "box-breathing",
    title: "Box Breathing",
    duration: "2 min",
    context: "pre-interview",
    steps: [
      "Sit comfortably. Close your eyes if that feels right.",
      "Breathe in slowly through your nose for 4 counts.",
      "Hold your breath gently for 4 counts.",
      "Breathe out slowly through your mouth for 4 counts.",
      "Hold again for 4 counts.",
      "Repeat 4 times. Notice how your body feels.",
    ],
  },
  {
    id: "grounding-5-4-3-2-1",
    title: "5-4-3-2-1 Grounding",
    duration: "3 min",
    context: "anxiety",
    steps: [
      "Pause and look around you.",
      "Name 5 things you can see.",
      "Name 4 things you can touch.",
      "Name 3 things you can hear.",
      "Name 2 things you can smell.",
      "Name 1 thing you can taste.",
      "Take a slow, deep breath. You're here. You're okay.",
    ],
  },
  {
    id: "power-pose",
    title: "Pre-Interview Power Reset",
    duration: "5 min",
    context: "pre-interview",
    steps: [
      "Find a private space — bathroom stall works.",
      "Stand with feet shoulder-width apart, hands on hips.",
      "Hold this posture for 2 minutes. It shifts your cortisol.",
      "Recall a time you solved a hard problem. Hold that feeling.",
      "Say to yourself: 'I am prepared. They invited me because they're interested.'",
      "Smile. Walk in like you belong there — because you do.",
    ],
  },
  {
    id: "body-scan",
    title: "Quick Body Scan",
    duration: "3 min",
    context: "general",
    steps: [
      "Sit or lie down. Close your eyes.",
      "Slowly scan from the top of your head downward.",
      "Notice tension in your forehead, jaw, shoulders.",
      "When you find tension, breathe into it. Don't fight it.",
      "Continue down: chest, stomach, hands, legs, feet.",
      "Take 3 deep breaths. Open your eyes when ready.",
    ],
  },
  {
    id: "motivation-reframe",
    title: "Motivation Reframe",
    duration: "2 min",
    context: "motivation",
    steps: [
      "Write down the thought that's draining you (e.g., 'I'll never find a job').",
      "Ask: Is this fact, or is this a fear disguised as fact?",
      "Rewrite it as something true and useful: 'Job searching is hard, and I'm doing it anyway.'",
      "Name one small thing you can do in the next 30 minutes.",
      "Do that one thing. Momentum builds from action, not from feeling ready.",
    ],
  },
];

/**
 * Get exercises relevant to a given context
 */
export function getExercisesForContext(context: MindfulnessExercise["context"]): MindfulnessExercise[] {
  return MINDFULNESS_EXERCISES.filter((e) => e.context === context || e.context === "general");
}

// ── Win Categories ──

export const WIN_CATEGORIES: { id: Win["category"]; label: string; emoji: string }[] = [
  { id: "application", label: "Application", emoji: "📝" },
  { id: "interview", label: "Interview", emoji: "🎤" },
  { id: "network", label: "Networking", emoji: "🤝" },
  { id: "skill", label: "Skill building", emoji: "📚" },
  { id: "personal", label: "Personal", emoji: "💪" },
  { id: "other", label: "Other", emoji: "⭐" },
];
