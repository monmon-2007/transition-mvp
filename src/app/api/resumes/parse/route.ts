import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Forward multipart directly to backend
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const backendForm = new FormData();
  backendForm.append("file", file, file.name);

  try {
    const res = await fetch(`${BACKEND_URL}/api/resumes/parse`, {
      method: "POST",
      headers: {
        "X-Internal-Secret": INTERNAL_SECRET,
        "X-User-Id": userId,
      },
      body: backendForm,
    });

    const text = await res.text();

    if (!res.ok) {
      let err = text;
      try { err = JSON.parse(text).error || text; } catch {}
      return NextResponse.json({ error: err }, { status: res.status });
    }

    // Backend returns raw JSON string of parsed resume data
    const data = JSON.parse(text);
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error("Resume parse proxy error:", err);
    return NextResponse.json({ error: "Unable to reach backend" }, { status: 502 });
  }
}
