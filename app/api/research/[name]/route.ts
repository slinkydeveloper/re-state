import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { getRestateClient } from "@/lib/restate-client";

/**
 * GET /api/research/:name
 * Get research details (criteria)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    // Get criteria via Restate
    const criteria = await getRestateClient()
      .objectClient(researchTracker, name)
      .getCriteria();

    return NextResponse.json({ name, criteria }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching research:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle Restate errors
    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch research", details: errorMessage },
      { status: 500 }
    );
  }
}
