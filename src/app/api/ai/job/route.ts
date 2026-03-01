import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiKey } from '@/lib/api/api.server';

const SUMMARIZER_THRESHOLD = 600;

async function summarizeJobDescription(rawText: string, genAI: GoogleGenerativeAI): Promise<string> {
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

Output a concise technical summary in plain text only, no bullet points, no markdown, no quotes, under 70 words.

Job Description:
${rawText}`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text().trim();

  return summary;
}

export async function POST(req: NextRequest) {
  try {
    const user_id = Number(req.headers.get('user_id'));

    const geminiKey = await getGeminiKey(user_id);

    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not found." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);

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
      job_summary = await summarizeJobDescription(rawText, genAI);
    }

    return NextResponse.json({ success: true, data: job_summary }, { status: 200 });
  } catch (error) {
    const status = (error as { status?: number }).status;

    if (status === 429) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'Your Gemini API key is invalid or expired.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Something went wrong summarizing the job description.' }, { status: 500 });
  }
}