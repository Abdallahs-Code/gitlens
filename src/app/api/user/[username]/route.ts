import { NextRequest, NextResponse } from 'next/server';
import { githubFetch, GitHubTokenExpiredError } from '@/lib/api/api.server';
import { GitHubProfile, GitHubRepo } from '@/lib/types';

export async function GET(req: NextRequest, context: { params: Promise<{ username: string }> }) {
  const user_id = Number(req.headers.get('user_id'));
  const { username } = await context.params;

  try {
    const profileRes = await githubFetch(`https://api.github.com/users/${username}`, user_id);

    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (profileRes.status === 403) {
        return NextResponse.json({ error: 'GitHub API rate limit exceeded' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
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

    const reposRes = await githubFetch(`https://api.github.com/users/${username}/repos`, user_id);

    if (!reposRes.ok) {
      if (reposRes.status === 403) {
        return NextResponse.json({ error: 'GitHub API rate limit exceeded' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
    }
    
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
  } catch (error) {
    if (error instanceof GitHubTokenExpiredError) {
      return NextResponse.json({ error: 'GitHub token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
