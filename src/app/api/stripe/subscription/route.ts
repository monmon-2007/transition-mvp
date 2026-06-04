import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

export async function GET() {
  const session = await getServerSession(authOptions as any) as any;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(`/api/users/${userId}/subscription`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    // No subscription record — return free tier
    return NextResponse.json({ plan: "free", status: "active" });
  } catch {
    return NextResponse.json({ plan: "free", status: "active" });
  }
}
