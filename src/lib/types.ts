export interface User {
  id: number
  username: string;
  email: string | null;
  avatar_url: string;
  bio: string | null;
}

export interface Thought {
  content: string;
  created_at: string;
  repo_name: string | null;
  users: {
    username: string;
    avatar_url: string;
  };
}

export interface GitHubProfile {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
}

export interface GitHubRepo {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

export interface GitHubProfileComparison extends GitHubProfile {
  total_stars: number;
  total_commits: number;
}

export interface AnalysisItem {
  name: string;
  count: number;
}

export interface ProfileAnalysisResult {
  username: string;
  seniority: string;
  roles: string[];
  languages: AnalysisItem[];
  tech: AnalysisItem[];
  architecture: AnalysisItem[];
  databases: AnalysisItem[];
  ci_cd: AnalysisItem[];
  testing: AnalysisItem[];
}

export type MatchResult = {
  verdict: "Strong" | "Moderate" | "Weak";
  strengths: string[];
  gaps: string[];
  explanation: string;
};