import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

/**
 * Validates the user session and returns the authenticated user ID.
 * Returns null if session is invalid or user ID is missing.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const userId = (session.user as any).id;

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  return userId;
}

/**
 * Calls the backend with the authenticated user's ID.
 * The user ID is set server-side from the session, NOT from client headers.
 */
async function callBackend(method: "GET" | "POST", body?: string): Promise<Response> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - please log in" },
      { status: 401 }
    );
  }

  try {
    const response = await backendFetch("/api/layoff-intake", {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: method === "POST" ? body : undefined,
    });

    return response;
  } catch (err: any) {
    console.error(`Backend ${method} request failed:`, err?.message || err);

    if (method === "GET") {
      // Fallback to 204 No Content for GET failures
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(
      { error: "Unable to reach backend service" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const response = await callBackend("GET");

  // Handle 404/500/502 from backend as "no intake found"
  if (!response.ok && [404, 500, 502].includes(response.status)) {
    return new NextResponse(null, { status: 204 });
  }

  // Return the backend response
  const responseBody = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/json";

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const response = await callBackend("POST", body);

  if (!response.ok) {
    const errorText = await response.text();
    return new NextResponse(errorText, {
      status: response.status,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  // Return the backend response
  const responseBody = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/json";

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}
