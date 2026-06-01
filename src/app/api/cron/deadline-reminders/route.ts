import { NextRequest, NextResponse } from "next/server";
import { buildDeadlineReminderEmail, type DeadlineType } from "@/lib/email/deadlineReminder";

/**
 * Cron endpoint: Check for users with upcoming deadlines and send reminders.
 * Triggered daily at 9am ET via Vercel Cron or external scheduler.
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
    // Query backend for users with deadlines in the next 7 days
    // This requires a backend endpoint — for now, return a placeholder response
    // In production: GET /api/internal/users-with-deadlines?daysAhead=7
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ message: "Backend not configured — skipping", sent: 0 });
    }

    const backendSecret = process.env.BACKEND_INTERNAL_SECRET;
    const res = await fetch(`${backendUrl}/api/internal/users-with-deadlines?daysAhead=7`, {
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
      deadlineType: DeadlineType;
      deadlineDate: string;
      daysRemaining: number;
    }> = await res.json();

    // Filter for reminder windows: 7 days, 3 days, 1 day
    const REMINDER_DAYS = [7, 3, 1];
    const toNotify = users.filter((u) => REMINDER_DAYS.includes(u.daysRemaining));

    let sent = 0;
    for (const user of toNotify) {
      const { subject, html } = buildDeadlineReminderEmail({
        userName: user.name || "there",
        deadlineType: user.deadlineType,
        deadlineDate: user.deadlineDate,
        daysRemaining: user.daysRemaining,
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

    return NextResponse.json({ message: "Deadline reminders processed", sent, total: toNotify.length });
  } catch (error) {
    console.error("Deadline reminder cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
