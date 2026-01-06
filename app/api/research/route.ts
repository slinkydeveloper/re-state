import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { getRestateClient } from "@/lib/restate-client";

/**
 * POST /api/research
 * Create a new research project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, criteria } = body;

    // Validate inputs
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Research name is required" },
        { status: 400 }
      );
    }

    if (!criteria || typeof criteria !== "string") {
      return NextResponse.json(
        { error: "Research criteria is required" },
        { status: 400 }
      );
    }

    // Validate name format (alphanumeric, hyphens, max 50 chars)
    const nameRegex = /^[a-zA-Z0-9-]+$/;
    if (!nameRegex.test(name) || name.length > 50) {
      return NextResponse.json(
        {
          error:
            "Research name must contain only letters, numbers, and hyphens (max 50 characters)",
        },
        { status: 400 }
      );
    }

    // Create research via Restate
    await getRestateClient()
      .objectClient(researchTracker, name)
      .createResearch(criteria);

    return NextResponse.json(
      { message: "Research created successfully", name },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating research:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle Restate errors
    if (errorMessage.includes("already exists")) {
      return NextResponse.json(
        { error: "Research with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create research", details: errorMessage },
      { status: 500 }
    );
  }
}
