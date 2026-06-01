import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigestEmail, type WeeklyDigestData } from "@/lib/email/weeklyDigest";

/**
 * Cron endpoint: Send weekly digest emails.
 * Triggered Monday at 9am ET via Vercel Cron or external scheduler.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const fromEmail = process.env.FROM_EMAIL || "notifications@novapivots.com";

  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ message: "Backend not configured — skipping", sent: 0 });
    }

    const backendSecret = process.env.BACKEND_INTERNAL_SECRET;

    // Query backend for all active users with their weekly stats
    // In production: GET /api/internal/weekly-digest-data
    const res = await fetch(`${backendUrl}/api/internal/weekly-digest-data`, {
      headers: {
        "X-Internal-Secret": backendSecret || "",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ message: "Backend query failed", sent: 0 });
    }

    const users: Array<{
      email: string;
      name: string;
      weekNumber: number;
      tasksCompleted: number;
      totalTasks: number;
      applicationsSent: number;
      interviewsScheduled: number;
      newContacts: number;
      runwayMonths?: number;
    }> = await res.json();

    let sent = 0;
    for (const user of users) {
      // Determine focus for next week based on their stats
      let focusForNextWeek = "Keep up the momentum — consistency is key.";
      if (user.applicationsSent === 0) {
        focusForNextWeek = "Send at least 3 applications this week. Each one increases your odds.";
      } else if (user.interviewsScheduled > 0) {
        focusForNextWeek = "Prepare for your upcoming interviews — research the companies and practice your stories.";
      } else if (user.newContacts === 0) {
        focusForNextWeek = "Reach out to 3-5 people in your network. Warm introductions are your fastest path to interviews.";
      } else if (user.runwayMonths !== undefined && user.runwayMonths < 3) {
        focusForNextWeek = "Your runway is getting short. Prioritize speed and consider broadening your search.";
      }

      const { subject, html } = buildWeeklyDigestEmail({
        userName: user.name || "there",
        weekNumber: user.weekNumber,
        tasksCompleted: user.tasksCompleted,
        totalTasks: user.totalTasks,
        applicationsSent: user.applicationsSent,
        interviewsScheduled: user.interviewsScheduled,
        newContacts: user.newContacts,
        runwayMonths: user.runwayMonths,
        focusForNextWeek,
        dashboardUrl: `${appUrl}/onboarding/layoff/dashboard`,
      });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: user.email,
          subject,
          html,
        }),
      });

      if (emailRes.ok) sent++;
    }

    return NextResponse.json({ message: "Weekly digests sent", sent, total: users.length });
  } catch (error) {
    console.error("Weekly digest cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
