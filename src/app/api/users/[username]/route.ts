import { NextRequest, NextResponse } from 'next/server';
import { githubFetch } from '@/lib/api';
import { GitHubProfile, GitHubRepo } from '@/types';

export async function GET(req: NextRequest, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;

  try {
    const profileRes = await githubFetch(`https://api.github.com/users/${username}`);
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const profile = await profileRes.json();
    const filteredProfile: GitHubProfile = {
      login: profile.login,
      avatar_url: profile.avatar_url,
      html_url: profile.html_url,
      name: profile.name,
      bio: profile.bio,
      followers: profile.followers,
      following: profile.following,
      public_repos: profile.public_repos,
    };

    const reposRes = await githubFetch(`https://api.github.com/users/${username}/repos`);
    const repos: GitHubRepo[] = await reposRes.json();
    const filteredRepos: GitHubRepo[] = repos.map((repo) => ({
      name: repo.name,
      html_url: repo.html_url,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      updated_at: repo.updated_at,
    }));

    return NextResponse.json({ filteredProfile, filteredRepos });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
