import { NextRequest, NextResponse } from "next/server";
import { researchTracker } from "@/restate/services/research-tracker";
import { getRestateClient } from "@/lib/restate-client";

/**
 * POST /api/questions/:researchName
 * Ask a question about the properties
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { researchName: string } }
) {
  try {
    const { researchName } = params;
    const body = await request.json();
    const { question } = body;

    // Validate question
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Ask question via Restate
    const answer = await getRestateClient()
      .objectClient(researchTracker, researchName)
      .askQuestion(question);

    return NextResponse.json({ question, answer }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error asking question:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to process question", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/questions/:researchName
 * Get Q&A history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { researchName: string } }
) {
  try {
    const { researchName } = params;

    // Get questions via Restate
    const questions = await getRestateClient()
      .objectClient(researchTracker, researchName)
      .getQuestions();

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching questions:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch questions", details: errorMessage },
      { status: 500 }
    );
  }
}
