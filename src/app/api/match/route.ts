import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobSummary, profileAnalysis } = body;

    if (!jobSummary || !profileAnalysis) {
      return NextResponse.json(
        { error: "jobSummary and profileAnalysis are required" },
        { status: 400 }
      );
    }

    const formattedData = `Candidate Profile:\n${JSON.stringify(profileAnalysis)}\n\nJob Summary:\n${jobSummary}`;

    const llmResponse = await fetch(
      `${process.env.LLM_SERVER_URL}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: formattedData,
        }),
      }
    );

    if (!llmResponse.ok) {
      throw new Error(
        `LLM server responded with status ${llmResponse.status}`
      );
    }

    const result = await llmResponse.json();

    if (result.status !== "ok") {
      throw new Error(result.message || "LLM evaluation failed");
    }

    const raw = result.result.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { raw };
    }

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}