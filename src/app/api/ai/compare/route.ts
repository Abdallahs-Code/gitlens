import { NextRequest, NextResponse } from "next/server";
import { GitHubProfileComparison } from "@/lib/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const googleAI = new GoogleGenerativeAI(geminiApiKey);

function createComparePrompt(
  user1: GitHubProfileComparison,
  user2: GitHubProfileComparison
): string {
  return `
You are a friendly tech analyst. Compare the following two GitHub developer profiles in a clear, engaging, human-readable way, highlighting:
- Overall community impact (followers, stars)
- Contribution habits (commits, public repos)
- Notable strengths of each developer
- Who has the stronger overall profile and why

Developer 1:
- Username: ${user1.login}
- Name: ${user1.name || "N/A"}
- Bio: ${user1.bio || "N/A"}
- Followers: ${user1.followers}
- Following: ${user1.following}
- Public Repos: ${user1.public_repos}
- Total Stars: ${user1.total_stars}
- Total Commits: ${user1.total_commits}

Developer 2:
- Username: ${user2.login}
- Name: ${user2.name || "N/A"}
- Bio: ${user2.bio || "N/A"}
- Followers: ${user2.followers}
- Following: ${user2.following}
- Public Repos: ${user2.public_repos}
- Total Stars: ${user2.total_stars}
- Total Commits: ${user2.total_commits}

Write a concise, engaging comparison (4-5 sentences) suitable for display on a web app.
Output plain text only with normal sentences; do not use quotation marks, markdown, bullet points, or any special formatting.
`;
}

export async function POST(req: NextRequest) {
  try {
    const { user1, user2 } = (await req.json()) as {
      user1: GitHubProfileComparison;
      user2: GitHubProfileComparison;
    };

    if (!user1 || !user2) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = createComparePrompt(user1, user2);

    const geminiModel = googleAI.getGenerativeModel({
      model: "models/gemini-2.5-flash-lite",
    });

    const result = await geminiModel.generateContent(prompt);
    const analysis = result.response.text();

    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Something went wrong generating the AI comparison" },
      { status: 500 }
    );
  }
}