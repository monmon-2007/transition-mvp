import { NextRequest, NextResponse } from "next/server";

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NovaPivots</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Your career transition companion</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Reset your password</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              We received a request to reset your password. Click the button below to choose a new one.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
              Reset my password
            </a>
            <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Or copy this link into your browser:<br>
              <span style="color:#6b7280;word-break:break-all;">${resetUrl}</span>
            </p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
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
      from: "NovaPivots <verify@contact.novapivots.com>",
      to: [email],
      subject: "Reset your NovaPivots password",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error("Failed to send email");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const backend = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
    const res = await fetch(`${backend}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    // If backend returned a token, send the email
    if (data.resetToken) {
      try {
        await sendPasswordResetEmail(data.email, data.resetToken);
      } catch (err) {
        console.error("Reset email send failed:", err);
      }
    }

    // Always return success — never reveal whether the email exists
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." }, { status: 200 });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
