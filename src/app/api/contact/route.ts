import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, category, message, website } = await request.json();

    // Honeypot check — real users never fill this field
    if (website) {
      // Silently succeed so bots don't know they were blocked
      return NextResponse.json({ message: "Message sent successfully" }, { status: 200 });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY is not set");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const categoryLabel: Record<string, string> = {
      feedback: "General Feedback",
      bug: "Bug Report",
      feature: "Feature Request",
      question: "Question",
      other: "Other",
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:28px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">NovaPivots — New Message</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${categoryLabel[category] || "Other"}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">From</p>
                  <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">${name}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${email}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Category</p>
                  <p style="margin:0;font-size:14px;color:#374151;">${categoryLabel[category] || "Other"}</p>
                </td>
              </tr>
              <tr>
                <td>
                  <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Message</p>
                  <div style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #f3f4f6;">
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                  </div>
                </td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 20px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              To reply, email <a href="mailto:${email}" style="color:#6b7280;">${email}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NovaPivots Contact <contact@contact.novapivots.com>",
        to: ["contact@contact.novapivots.com"],
        reply_to: email,
        subject: `[${categoryLabel[category] || "Other"}] Message from ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message: "Message sent successfully" }, { status: 200 });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
