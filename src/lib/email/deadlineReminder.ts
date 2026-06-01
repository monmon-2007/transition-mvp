/**
 * Deadline reminder email template.
 * Used by the cron job to notify users of upcoming deadlines.
 */

export type DeadlineType =
  | "severance-sign"
  | "cobra-enrollment"
  | "equity-exercise"
  | "equipment-return"
  | "benefits-end";

const DEADLINE_CONFIG: Record<DeadlineType, { label: string; emoji: string; urgencyColor: string }> = {
  "severance-sign": { label: "Severance Sign Deadline", emoji: "📝", urgencyColor: "#dc2626" },
  "cobra-enrollment": { label: "COBRA Enrollment Deadline", emoji: "🏥", urgencyColor: "#d97706" },
  "equity-exercise": { label: "Equity Exercise Deadline", emoji: "📊", urgencyColor: "#7c3aed" },
  "equipment-return": { label: "Equipment Return Deadline", emoji: "💻", urgencyColor: "#2563eb" },
  "benefits-end": { label: "Benefits End Date", emoji: "🛡️", urgencyColor: "#059669" },
};

export function buildDeadlineReminderEmail(params: {
  userName: string;
  deadlineType: DeadlineType;
  deadlineDate: string;
  daysRemaining: number;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const config = DEADLINE_CONFIG[params.deadlineType];
  const formattedDate = new Date(params.deadlineDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const urgencyText =
    params.daysRemaining <= 1
      ? "This deadline is <strong>tomorrow</strong>."
      : params.daysRemaining <= 3
      ? `This deadline is in <strong>${params.daysRemaining} days</strong>.`
      : `This deadline is in <strong>${params.daysRemaining} days</strong>.`;

  const subject = `${config.emoji} ${params.daysRemaining <= 1 ? "TOMORROW" : `${params.daysRemaining} days`}: ${config.label}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NovaPivots</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Deadline Reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Hi ${params.userName},</p>
            <div style="background:#fef2f2;border-left:4px solid ${config.urgencyColor};border-radius:8px;padding:16px 20px;margin:20px 0;">
              <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827;">
                ${config.emoji} ${config.label}
              </h2>
              <p style="margin:0;font-size:15px;color:#374151;font-weight:600;">
                ${formattedDate}
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
                ${urgencyText}
              </p>
            </div>
            <a href="${params.dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;margin-top:12px;">
              View on your dashboard
            </a>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this because you have an upcoming deadline tracked on NovaPivots.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
