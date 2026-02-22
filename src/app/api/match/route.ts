import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

const MATCH_PROMPT = `You are a technical recruiter AI. Given a candidate's GitHub profile analysis and a job summary, evaluate how well the candidate fits the role.

You MUST respond with ONLY valid JSON — no markdown, no code blocks, no extra text.

The JSON must follow this exact structure:
{
  "verdict": "Strong" | "Moderate" | "Weak",
  "strengths": ["string", "string", ...],
  "gaps": ["string", "string", ...],
  "explanation": "string"
}

Guidelines:
- "verdict" should reflect the overall fit honestly
- "strengths" should list specific skills or experiences from the profile that align with the job requirements
- "gaps" should list missing or weak areas compared to the job requirements
- "explanation" should be a concise 2–3 sentence summary of your reasoning`;

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

    const input = `Candidate Profile:\n${JSON.stringify(profileAnalysis, null, 2)}\n\nJob Summary:\n${jobSummary}`;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash-lite" });

    const result = await model.generateContent([
      { text: MATCH_PROMPT },
      { text: input },
    ]);

    const raw = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}