/**
 * Job alert email template.
 * Used by the job alerts cron to notify users of new matched jobs.
 */

export type JobAlertJob = {
  position: string;
  company: string;
  location: string;
  matchScore: number;
  jobUrl: string;
  salary?: string;
};

export function buildJobAlertEmail(params: {
  userName: string;
  searchName: string;
  jobs: JobAlertJob[];
  dashboardUrl: string;
}): { subject: string; html: string } {
  const { userName, searchName, jobs, dashboardUrl } = params;
  const firstName = userName.split(" ")[0] || "there";

  const jobRows = jobs
    .slice(0, 5)
    .map(
      (job) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <div style="margin:0 0 4px;">
            <a href="${job.jobUrl}" style="color:#4f46e5;font-size:15px;font-weight:600;text-decoration:none;">
              ${job.position}
            </a>
          </div>
          <div style="font-size:13px;color:#6b7280;margin:0 0 6px;">
            ${job.company}${job.location ? ` · ${job.location}` : ""}${job.salary && job.salary !== "Not specified" ? ` · ${job.salary}` : ""}
          </div>
          <span style="display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;${
            job.matchScore >= 70
              ? "background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"
              : job.matchScore >= 50
              ? "background:#fffbeb;color:#d97706;border:1px solid #fde68a;"
              : "background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;"
          }">
            ${job.matchScore}% match
          </span>
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">
      New jobs matching &ldquo;${searchName}&rdquo;, ${firstName}
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      We found ${jobs.length} new job${jobs.length === 1 ? "" : "s"} matching your saved search.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${jobRows}
    </table>
    ${
      jobs.length > 5
        ? `<p style="margin:0 0 20px;font-size:13px;color:#9ca3af;">
            + ${jobs.length - 5} more matches
          </p>`
        : ""
    }
    <a href="${dashboardUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
      View all matches
    </a>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
      You're receiving this because you saved the search &ldquo;${searchName}&rdquo;. Manage your saved searches from the dashboard.
    </p>
  `;

  const subject = `${jobs.length} new job${jobs.length === 1 ? "" : "s"} matching "${searchName}"`;

  return { subject, html };
}
