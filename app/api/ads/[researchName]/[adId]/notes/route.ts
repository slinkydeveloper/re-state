import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { getRestateClient } from "@/lib/restate-client";

/**
 * PATCH /api/ads/:researchName/:adId/notes
 * Update property ad notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { researchName: string; adId: string } }
) {
  try {
    const { researchName, adId } = params;
    const body = await request.json();
    const { notes } = body;

    // Validate notes
    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 }
      );
    }

    // Update notes via Restate
    await getRestateClient()
      .objectClient(researchTracker, researchName)
      .updateAdNotes({ adId, notes });

    return NextResponse.json(
      { message: "Notes updated successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating ad notes:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        { error: "Property ad not found in this research" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update ad notes", details: errorMessage },
      { status: 500 }
    );
  }
}
