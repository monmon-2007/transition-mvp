import posthog from 'posthog-js';

/** Centralized analytics events — all PostHog captures go through here */
export const analytics = {
  // Auth
  userSignedUp: (email: string) =>
    posthog.capture('user_signed_up', { email }),
  userLoggedIn: (method: 'credentials' | 'google') =>
    posthog.capture('user_logged_in', { method }),

  // Onboarding
  intakeCompleted: (props: Record<string, unknown>) =>
    posthog.capture('intake_completed', props),

  // Resume
  resumeUploaded: () =>
    posthog.capture('resume_uploaded'),
  resumeTailored: (jobTitle?: string) =>
    posthog.capture('resume_tailored', { jobTitle }),
  coverLetterGenerated: (company?: string) =>
    posthog.capture('cover_letter_generated', { company }),

  // Applications
  applicationAdded: (status: string) =>
    posthog.capture('application_added', { status }),
  applicationStatusChanged: (from: string, to: string) =>
    posthog.capture('application_status_changed', { from, to }),

  // Tasks
  taskCompleted: (category: string) =>
    posthog.capture('task_completed', { category }),

  // Jobs
  jobSaved: (company: string, position: string) =>
    posthog.capture('job_saved', { company, position }),
  jobSuggestionsViewed: () =>
    posthog.capture('job_suggestions_viewed'),

  // Negotiation
  negotiationEmailGenerated: () =>
    posthog.capture('negotiation_email_generated'),

  // Subscription
  checkoutStarted: (plan: string) =>
    posthog.capture('checkout_started', { plan }),
  subscriptionActivated: (plan: string) =>
    posthog.capture('subscription_activated', { plan }),

  // Feature gates
  upgradePromptShown: (feature: string) =>
    posthog.capture('upgrade_prompt_shown', { feature }),
  pricingPageViewed: () =>
    posthog.capture('pricing_page_viewed'),

  // Landing page
  ctaClicked: (location: string) =>
    posthog.capture('cta_clicked', { location }),
};
