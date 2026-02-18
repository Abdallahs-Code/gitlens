import { NextRequest, NextResponse } from 'next/server';
import { githubFetch } from '@/lib/api.server';
import { GitHubProfile, GitHubRepo } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user1 = searchParams.get('user1');
  const user2 = searchParams.get('user2');

  if (!user1 || !user2) {
    return NextResponse.json({ error: 'Two usernames are required' }, { status: 400 });
  }

  try {
    const fetchUserData = async (username: string) => {
      const profileRes = await githubFetch(`https://api.github.com/users/${username}`);
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

      const totalStars = filteredRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

      let totalCommits = 0;

      for (const repo of filteredRepos) {
        const commitsRes = await githubFetch(
          `https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=1`
        );

        if (!commitsRes.ok) continue;

        const linkHeader = commitsRes.headers.get('Link');
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
          if (match) {
            totalCommits += parseInt(match[1], 10);
          }
        } else {
          // No link header means no pagination meaning there is either 1 or 0 commits
          const commits = await commitsRes.json();
          if (Array.isArray(commits)) {
            totalCommits += commits.length;
          }
        }
      }

      return {
        ...filteredProfile,       
        total_stars: totalStars,
        total_commits: totalCommits,
      };
    };

    const [data1, data2] = await Promise.all([fetchUserData(user1), fetchUserData(user2)]);

    if (!data1 || !data2) {
      return NextResponse.json({ error: 'One or both users not found' }, { status: 404 });
    }

    const comparison = {
      [user1]: data1,
      [user2]: data2,
    };

    return NextResponse.json({ comparison });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
