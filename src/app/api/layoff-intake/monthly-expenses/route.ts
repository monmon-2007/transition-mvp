import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  return userId && typeof userId === "string" ? userId : null;
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();

  try {
    const res = await backendFetch("/api/layoff-intake/monthly-expenses", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body,
    });

    return new NextResponse(null, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
