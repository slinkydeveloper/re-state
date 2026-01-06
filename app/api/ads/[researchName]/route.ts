import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { getRestateClient } from "@/lib/restate-client";

/**
 * POST /api/ads/:researchName
 * Add a new property ad by URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { researchName: string } }
) {
  try {
    const { researchName } = params;
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL domain
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (
      !urlObj.hostname.includes("idealista.it") &&
      !urlObj.hostname.includes("immobiliare.it")
    ) {
      return NextResponse.json(
        { error: "Only idealista.it and immobiliare.it URLs are supported" },
        { status: 400 }
      );
    }

    // Add ad via Restate
    const propertyAd = await getRestateClient()
      .objectClient(researchTracker, researchName)
      .addAd(url);

    return NextResponse.json(propertyAd, { status: 201 });
  } catch (error: unknown) {
    console.error("Error adding ad:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle specific errors
    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to add property ad", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ads/:researchName
 * List all property ads
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { researchName: string } }
) {
  try {
    const { researchName } = params;

    // Get ads via Restate
    const ads = await getRestateClient()
      .objectClient(researchTracker, researchName)
      .getAds();

    return NextResponse.json({ ads }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching ads:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch ads", details: errorMessage },
      { status: 500 }
    );
  }
}
