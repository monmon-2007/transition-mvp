import { NextRequest, NextResponse } from "next/server";

// Used by the login page to distinguish "wrong password" from "unverified email"
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ unverified: false }, { status: 200 });
  }

  const backend = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

  try {
    const res = await fetch(
      `${backend}/auth/check-verification?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) return NextResponse.json({ unverified: false });
    const data = await res.json();
    return NextResponse.json({ unverified: data.unverified === true });
  } catch {
    return NextResponse.json({ unverified: false });
  }
}
