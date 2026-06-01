/**
 * Celebration messages shown when users complete key tasks.
 * Maps task IDs to contextual, encouraging messages.
 */

export type Celebration = {
  title: string;
  description: string;
  emoji: string;
};

// Task category → celebration message
const CATEGORY_CELEBRATIONS: Record<string, Celebration> = {
  "file-unemployment": {
    title: "Unemployment filed!",
    description: "That could be worth thousands in benefits over the coming months.",
    emoji: "🎉",
  },
  "review-severance": {
    title: "Severance reviewed!",
    description: "Knowledge is leverage. You now know exactly what you're working with.",
    emoji: "📋",
  },
  "negotiate-severance": {
    title: "Negotiation email sent!",
    description: "Most people don't even try. You just took a step that could pay off significantly.",
    emoji: "💪",
  },
  "update-resume": {
    title: "Resume updated!",
    description: "A polished resume is your #1 tool. You're ready to start applying.",
    emoji: "📄",
  },
  "setup-cobra": {
    title: "Health insurance sorted!",
    description: "One less thing to worry about. Your coverage is secure.",
    emoji: "🏥",
  },
  "first-application": {
    title: "First application sent!",
    description: "The hardest part is starting. Every application increases your odds.",
    emoji: "🚀",
  },
  "network-outreach": {
    title: "Network message sent!",
    description: "80% of jobs come through connections. You're playing the smart game.",
    emoji: "🤝",
  },
  "setup-finances": {
    title: "Finances organized!",
    description: "Knowing your runway gives you clarity and confidence in your decisions.",
    emoji: "💰",
  },
};

// Generic fallback celebrations by priority
const GENERIC_CELEBRATIONS: Celebration[] = [
  { title: "Task complete!", description: "Every step forward counts. Keep the momentum going.", emoji: "✅" },
  { title: "Nice work!", description: "You're making real progress on your transition plan.", emoji: "⭐" },
  { title: "Done!", description: "That's one more thing off your plate.", emoji: "👏" },
];

export function getCelebration(taskCategory?: string): Celebration {
  if (taskCategory && CATEGORY_CELEBRATIONS[taskCategory]) {
    return CATEGORY_CELEBRATIONS[taskCategory];
  }
  // Rotate through generic celebrations based on time
  const idx = Math.floor(Date.now() / 60000) % GENERIC_CELEBRATIONS.length;
  return GENERIC_CELEBRATIONS[idx];
}
