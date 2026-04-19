import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  }

  const backend = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

  try {
    const res = await fetch(`${backend}/auth/verify?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Verification failed" }, { status: res.status });
    }

    return NextResponse.json({ message: "Email verified successfully" }, { status: 200 });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Verification service unavailable" }, { status: 502 });
  }
}
