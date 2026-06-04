import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendClient";
import { sendRunwayReminderEmail, sendJobMatchEmail } from "@/lib/emails";

/**
 * Cron endpoint: Send drip emails to users based on account age.
 * Run daily. Sends:
 *   - Day 2: Runway calculator nudge
 *   - Day 4: AI job match nudge
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch users created 2 days ago (runway email) and 4 days ago (job match email)
    const [day2Res, day4Res] = await Promise.all([
      backendFetch("/api/users/by-age?daysAgo=2"),
      backendFetch("/api/users/by-age?daysAgo=4"),
    ]);

    let sent = 0;

    if (day2Res.ok) {
      const users: Array<{ email: string; name: string }> = await day2Res.json();
      for (const u of users) {
        const ok = await sendRunwayReminderEmail(u.email, u.name || "");
        if (ok) sent++;
      }
    }

    if (day4Res.ok) {
      const users: Array<{ email: string; name: string }> = await day4Res.json();
      for (const u of users) {
        const ok = await sendJobMatchEmail(u.email, u.name || "");
        if (ok) sent++;
      }
    }

    return NextResponse.json({ sent, message: `Drip emails sent: ${sent}` });
  } catch (err) {
    console.error("Welcome drip cron error:", err);
    return NextResponse.json({ error: "Drip cron failed" }, { status: 500 });
  }
}
