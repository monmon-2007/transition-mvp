import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";

/**
 * Validates the user session and returns the authenticated user ID.
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
 * Analyze uploaded documents using the backend service.
 *
 * POST /api/layoff-intake/analyze-documents
 *
 * Accepts multipart/form-data with file(s).
 * User identity is validated server-side from NextAuth session.
 */
export async function POST(request: NextRequest) {
  // Validate session
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      { success: false, errorMessage: "Unauthorized - please log in" },
      { status: 401 }
    );
  }

  const MAX_FILES = 3;
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Validate file count and size before forwarding to backend
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, errorMessage: "No files uploaded" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, errorMessage: `You can upload a maximum of ${MAX_FILES} files at once` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, errorMessage: `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB file size limit` },
          { status: 400 }
        );
      }
    }

    // Forward the request to the backend with trusted user ID
    // Note: Do not set Content-Type — fetch sets it automatically for FormData (multipart boundary)
    const response = await backendFetch("/api/layoff-intake/analyze-documents", {
      method: "POST",
      headers: {
        "X-User-Id": userId,
      },
      body: formData as any,
    });

    // Get the response
    const responseBody = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });

  } catch (err: any) {
    console.error("Document analysis request failed");

    return NextResponse.json(
      {
        success: false,
        errorMessage: "Failed to analyze documents. Please try again or continue manually."
      },
      { status: 502 }
    );
  }
}
