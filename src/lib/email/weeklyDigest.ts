/**
 * Weekly digest email template.
 * Summarizes the past week and suggests focus for the next.
 */

export type WeeklyDigestData = {
  userName: string;
  weekNumber: number;
  tasksCompleted: number;
  totalTasks: number;
  applicationsSent: number;
  interviewsScheduled: number;
  newContacts: number;
  runwayMonths?: number;
  focusForNextWeek: string;
  dashboardUrl: string;
};

export function buildWeeklyDigestEmail(data: WeeklyDigestData): { subject: string; html: string } {
  const subject = `Week ${data.weekNumber} Recap: ${data.tasksCompleted} tasks done, ${data.applicationsSent} applications`;

  const stats = [
    { label: "Tasks completed", value: String(data.tasksCompleted), color: "#8b5cf6" },
    { label: "Applications", value: String(data.applicationsSent), color: "#2563eb" },
    { label: "Interviews", value: String(data.interviewsScheduled), color: "#059669" },
    { label: "New contacts", value: String(data.newContacts), color: "#d97706" },
  ];

  const statsHtml = stats
    .map(
      (s) => `
    <td style="text-align:center;padding:12px;">
      <p style="margin:0;font-size:24px;font-weight:700;color:${s.color};">${s.value}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">${s.label}</p>
    </td>`
    )
    .join("");

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
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Week ${data.weekNumber} Recap</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${data.userName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Here's your progress from the past week. ${
                data.tasksCompleted > 0
                  ? "You're making real progress — keep the momentum going."
                  : "Every journey has slower weeks. What matters is showing up."
              }
            </p>

            <!-- Stats grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
              <tr>${statsHtml}</tr>
            </table>

            ${
              data.runwayMonths !== undefined
                ? `<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
                    📊 <strong>Runway:</strong> ~${data.runwayMonths.toFixed(1)} months remaining
                  </p>`
                : ""
            }

            <!-- This week's focus -->
            <div style="background:#f3f0ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">This week's focus</p>
              <p style="margin:0;font-size:15px;color:#374151;font-weight:600;">${data.focusForNextWeek}</p>
            </div>

            <a href="${data.dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
              Go to your dashboard
            </a>

            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this weekly recap from NovaPivots.
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
