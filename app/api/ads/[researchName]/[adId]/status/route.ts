import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { AdStatusSchema } from "@/restate/services/types";
import { getRestateClient } from "@/lib/restate-client";

/**
 * PATCH /api/ads/:researchName/:adId/status
 * Update property ad status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { researchName: string; adId: string } }
) {
  try {
    const { researchName, adId } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const parseResult = AdStatusSchema.safeParse(status);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid status value",
          validStatuses: [
            "to reach out",
            "visit appointment taken",
            "sent the offer",
            "bought",
            "rejected",
          ],
        },
        { status: 400 }
      );
    }

    // Update status via Restate
    await getRestateClient()
      .objectClient(researchTracker, researchName)
      .updateAdStatus({ adId, status: parseResult.data });

    return NextResponse.json(
      { message: "Status updated successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating ad status:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        { error: "Property ad not found in this research" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update ad status", details: errorMessage },
      { status: 500 }
    );
  }
}
