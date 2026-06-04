const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "NovaPivots <hello@contact.novapivots.com>";

function getResendKey(): string | null {
  return process.env.RESEND_API_KEY || null;
}

function getAppUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = getResendKey();
  if (!key) {
    console.error("RESEND_API_KEY not set — skipping email");
    return false;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return false;
  }
  return true;
}

function wrapEmail(content: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">NovaPivots</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Your career transition companion</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            ${content}
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              <a href="${appUrl}" style="color:#7c3aed;text-decoration:none;">NovaPivots</a> · Career transition made clear
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Sent immediately after registration + email verification */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const appUrl = getAppUrl();
  const firstName = name.split(" ")[0] || "there";

  const html = wrapEmail(`
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Welcome to NovaPivots, ${firstName}!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      You just took the most important step — getting organized. Here's what to do next:
    </p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:15px;color:#374151;line-height:1.8;">
      <li><strong>Complete your intake</strong> — answer a few questions so we can build your plan</li>
      <li><strong>Upload your resume</strong> — our AI will tailor it to every job you apply to</li>
      <li><strong>Check your tasks</strong> — we've prioritized your first week based on deadlines</li>
    </ol>
    <a href="${appUrl}/onboarding"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
      Go to my dashboard
    </a>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
      Questions? Reply to this email — a real person reads every message.
    </p>
  `);

  return sendEmail(email, "Welcome to NovaPivots — here's your first step", html);
}

/** Sent ~2 days after signup — nudge to use runway calculator */
export async function sendRunwayReminderEmail(email: string, name: string): Promise<boolean> {
  const appUrl = getAppUrl();
  const firstName = name.split(" ")[0] || "there";

  const html = wrapEmail(`
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Do you know your financial runway, ${firstName}?</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      Most people we talk to don't know exactly how many months their savings will last. That uncertainty makes every decision harder.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Your NovaPivots dashboard has a <strong>financial runway calculator</strong> that shows you exactly where you stand — and what moves extend your timeline.
    </p>
    <a href="${appUrl}/onboarding/layoff/dashboard"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
      Calculate my runway
    </a>
  `);

  return sendEmail(email, `${firstName}, do you know how many months you have?`, html);
}

/** Sent by job alert cron — new matched jobs for a saved search */
export async function sendJobAlertEmail(
  email: string,
  name: string,
  searchName: string,
  jobs: import("@/lib/email/jobAlert").JobAlertJob[],
): Promise<boolean> {
  const { buildJobAlertEmail } = await import("@/lib/email/jobAlert");
  const appUrl = getAppUrl();
  const { subject, html } = buildJobAlertEmail({
    userName: name,
    searchName,
    jobs,
    dashboardUrl: `${appUrl}/onboarding/layoff/dashboard`,
  });
  return sendEmail(email, subject, wrapEmail(html));
}

/** Sent ~4 days after signup — nudge to try AI job match */
export async function sendJobMatchEmail(email: string, name: string): Promise<boolean> {
  const appUrl = getAppUrl();
  const firstName = name.split(" ")[0] || "there";

  const html = wrapEmail(`
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Jobs matched to your resume, ${firstName}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      Applying to every listing is exhausting and ineffective. NovaPivots Pro analyzes your resume against real job postings and shows you the best matches — with a keyword-match score so you know where you stand.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Try it with a 7-day free trial. If it doesn't save you hours, cancel anytime.
    </p>
    <a href="${appUrl}/pricing"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
      See AI job matches
    </a>
  `);

  return sendEmail(email, `${firstName}, we found jobs that match your resume`, html);
}
