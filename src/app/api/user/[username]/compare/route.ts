import { NextRequest, NextResponse } from 'next/server';
import { githubFetch, GitHubTokenExpiredError } from '@/lib/api/api.server';
import { GitHubProfile, GitHubRepo } from '@/lib/types';

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ username: string }> }
) {
  const user_id = Number(req.headers.get('user_id'));
  const url = new URL(req.url);
  const opponent = url.searchParams.get('opponent');

  const { username } = await context.params;

  if (!username || !opponent) {
    return NextResponse.json({ error: 'Two usernames are required' }, { status: 400 });
  }

  try {
    const fetchUserData = async (username: string) => {
      const [profileRes, reposRes] = await Promise.all([
        githubFetch(`https://api.github.com/users/${username}`, user_id),
        githubFetch(`https://api.github.com/users/${username}/repos?per_page=100`, user_id)
      ]);

      const profile = await profileRes.json();
      const repos: GitHubRepo[] = await reposRes.json();

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

      const filteredRepos: GitHubRepo[] = repos.map((repo) => ({
        name: repo.name,
        html_url: repo.html_url,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        updated_at: repo.updated_at,
      }));

      const totalStars = filteredRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

      const commitPromises = filteredRepos.map(async (repo) => {
        const commitsRes = await githubFetch(
          `https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=1`, user_id
        );

        if (!commitsRes.ok) return 0;

        const linkHeader = commitsRes.headers.get('Link');
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
          if (match) return parseInt(match[1], 10);
        } else {
          const commits = await commitsRes.json();
          return Array.isArray(commits) ? commits.length : 0;
        }
        return 1; 
      });

      const commitCounts = await Promise.all(commitPromises);
      const totalCommits = commitCounts.reduce((sum, count) => sum + count, 0);

      return {
        ...filteredProfile,
        total_stars: totalStars,
        total_commits: totalCommits,
      };
    };

    const [data1, data2] = await Promise.all([
      fetchUserData(username), 
      fetchUserData(opponent)
    ]);

    if (!data1 || !data2) {
      return NextResponse.json({ error: 'One or both users not found' }, { status: 404 });
    }

    const comparison = {
      [username]: data1,
      [opponent]: data2,
    };

    return NextResponse.json({ comparison });
  } catch (error) {
    if (error instanceof GitHubTokenExpiredError) {
      return NextResponse.json({ error: 'GitHub token expired' }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}