import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const SUMMARIZER_THRESHOLD = 900;

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

async function summarizeJobDescription(rawText: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash-lite",
  });

  const prompt = `You are a technical job description summarizer.
Your task is to extract and summarize only the technical and role-relevant information from the job description below.

Focus on:
- Seniority level and role title
- Required programming languages and frameworks
- Must-have technical skills and experience
- Preferred/nice-to-have technical skills
- Architecture patterns or system design expectations
- Databases, cloud platforms, CI/CD tools if mentioned
- Any domain-specific technical context

Ignore completely:
- Company culture, values, and DEI statements
- Benefits, salary, relocation info
- "A day in the life" or "About the team" sections
- Legal disclaimers and equal opportunity statements

Output a concise technical summary in plain text only, no bullet points, no markdown, no quotes, under 100 words.

Job Description:
${rawText}`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text().trim();

  return summary;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" in request body' },
        { status: 400 }
      );
    }

    const rawText = body.text.trim();

    let job_summary: string;

    if (rawText.length <= SUMMARIZER_THRESHOLD) {
      job_summary = rawText;
    } else {
      job_summary = await summarizeJobDescription(rawText);
    }

    return NextResponse.json({ success: true, data: job_summary }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing job description:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}