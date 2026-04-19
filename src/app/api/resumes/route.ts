import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  return userId && typeof userId === "string" ? userId : null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await backendFetch("/api/resumes", {
      headers: { "X-User-Id": userId },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  try {
    const res = await backendFetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
