import { NextRequest, NextResponse } from "next/server";
import { GitHubProfileComparison } from "@/lib/types";
import { decrypt } from "@/lib/auth";
import { getGeminiKey } from "@/lib/api/api.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const user_id = Number(req.headers.get('user_id'));

    const geminiKey = await getGeminiKey(user_id);

    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not found." }, { status: 400 });
    }

    const googleAI = new GoogleGenerativeAI(geminiKey);
    
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
  } catch (error) {

    const status = (error as { status?: number }).status;

    if (status === 429) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'Your Gemini API key is invalid or expired.' }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Something went wrong generating the AI comparison" },
      { status: 500 }
    );
  }
}