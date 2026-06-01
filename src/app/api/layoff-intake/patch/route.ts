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
    // The backend POST endpoint already does upsert — we just forward the partial fields
    // The Spring Boot backend merges non-null fields on save
    const res = await backendFetch("/api/layoff-intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new NextResponse(errorText, { status: res.status });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
