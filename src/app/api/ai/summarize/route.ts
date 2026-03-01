import { NextRequest, NextResponse } from "next/server";
import { getGeminiKey } from "@/lib/api/api.server";
import { GitHubProfile, GitHubRepo } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

function analyzeRepos(repos: GitHubRepo[]) {
  const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);

  const languages: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) {
      languages[r.language] = (languages[r.language] || 0) + 1;
    }
  });

  const mostStarredRepo = repos.reduce((max, r) =>
    r.stargazers_count > max.stargazers_count ? r : max
  , repos[0]);

  const mostRecentRepo = repos.reduce((latest, r) =>
    new Date(r.updated_at) > new Date(latest.updated_at) ? r : latest
  , repos[0]);

  return { totalStars, languages, mostStarredRepo, mostRecentRepo };
}

function formatRepoList(repos: GitHubRepo[], maxRepos = 50) {
  return repos
    .slice(0, maxRepos) 
    .map(r => `- ${r.name} (${r.stargazers_count} ⭐, ${r.forks_count} forks, ${r.language || "N/A"}): ${r.description || "No description"}`)
    .join("\n");
}

function createGitHubSummaryPrompt(profile: GitHubProfile, repos: GitHubRepo[]) {
  const { totalStars, languages, mostStarredRepo, mostRecentRepo } = analyzeRepos(repos);

  const languageList = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${lang} (${count} repos)`)
    .join(", ") || "No primary language";

  const repoListText = formatRepoList(repos);

  return `
You are a friendly tech assistant. Summarize the following GitHub user profile in a clear, human-readable way, highlighting:
- Overall stats (followers, following, public repos)
- Main programming languages
- Popular repos (stars/forks)
- Recent activity
- Any notable insights based on the data
- Notable projects the user is working on

Profile:
- Username: ${profile.login}
- Name: ${profile.name || "N/A"}
- Bio: ${profile.bio || "N/A"}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Public Repos: ${profile.public_repos}
- GitHub URL: ${profile.html_url}

Repository Summary:
- Total Stars across all repos: ${totalStars}
- Most starred repo: ${mostStarredRepo.name} (${mostStarredRepo.stargazers_count} stars) - ${mostStarredRepo.html_url}
- Most recently updated repo: ${mostRecentRepo.name} (updated at ${mostRecentRepo.updated_at}) - ${mostRecentRepo.html_url}
- Languages used: ${languageList}

Full repository list (showing up to 50 repos):
${repoListText}

Write a concise, engaging summary (8-10 sentences) about this user and their notable projects, suitable for display on a web app.
Output plain text only with normal sentences; do not use quotation marks, markdown, or any special formatting.
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
    
    const { profile, repos } = await req.json() as { profile: GitHubProfile; repos: GitHubRepo[] };

    const prompt = createGitHubSummaryPrompt(profile, repos);

    const geminiModel = googleAI.getGenerativeModel({
      model: "models/gemini-2.5-flash-lite",
    });

    const result = await geminiModel.generateContent(prompt);

    const summary = result.response.text();

    return NextResponse.json({ summary });
  } catch (error) {
    const status = (error as { status?: number }).status;

    if (status === 429) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'Your Gemini API key is invalid or expired.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Something went wrong generating the summary.' }, { status: 500 });
  }
}
