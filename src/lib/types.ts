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

export interface Note {
  id: string;
  username: string;
  repo_name: string | null;
  content: string;
  created_at: string;
}

export interface AnalysisItem {
  name: string;
  count: number;
}

export interface JobAnalysisResult {
  seniority: string;
  roles: string[];
  languages: AnalysisItem[];
  tech: AnalysisItem[];
  architecture: AnalysisItem[];
  databases: AnalysisItem[];
  ci_cd: AnalysisItem[];
  testing: AnalysisItem[];
}

export interface ProfileAnalysisResult extends JobAnalysisResult {
  profile: string;
}