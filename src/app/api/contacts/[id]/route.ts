import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  return userId && typeof userId === "string" ? userId : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  try {
    const res = await backendFetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body,
    });
    if (res.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await backendFetch(`/api/contacts/${id}`, {
      method: "DELETE",
      headers: { "X-User-Id": userId },
    });
    return new NextResponse(null, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
