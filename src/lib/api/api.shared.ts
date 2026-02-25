import axios from "axios";
import { 
  GitHubProfile,
  GitHubRepo, 
  GitHubProfileComparison, 
  Thought,
  ProfileAnalysisResult,
  MatchResult
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://gitlens-snowy.vercel.app";

export const githubFlow = () => {
  window.location.href = `${API_BASE}/api/auth/github`;
};

export const disconnect = async (): Promise<void> => {
  await axios.post(`${API_BASE}/api/auth/disconnect`);
};

export const getCurrentUser = async () => {
  const { data } = await axios.get(`${API_BASE}/api/auth/me`);
  return data;
};

export const fetchUserData = async (username: string): Promise<{ profile: GitHubProfile; repos: GitHubRepo[] }> => {
  const { data } = await axios.get(`${API_BASE}/api/user/${username}`);
  return {
    profile: data.filteredProfile,
    repos: data.filteredRepos,
  };
};

export const fetchThoughts = async (
  username: string
): Promise<Thought[]> => {
  const url = `${API_BASE}/api/thoughts?username=${username}`;
  const { data } = await axios.get(url);
  return Array.isArray(data) ? data : data.thoughts;
};

export const addThought = async (
  thought: { username: string; repo_name: string | null; content: string }
): Promise<Thought> => {
  const { data } = await axios.post(`${API_BASE}/api/thoughts`, thought);
  return data.thought; 
};

export const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString();
};

export const summarizeProfile = async (
  profile: GitHubProfile,
  repos: GitHubRepo[]
): Promise<string> => {
  const { data } = await axios.post(`${API_BASE}/api/ai/summarize`, {
    profile,
    repos,
  });
  return data.summary; 
};

export const compareUsers = async (
  username: string,
  opponent: string
): Promise<{ comparison: { [key: string]: GitHubProfileComparison } }> => {
  const { data } = await axios.get(
    `${API_BASE}/api/user/${username}/compare?opponent=${opponent}`
  );
  return data;
};

export const aiCompareUsers = async (
  user1: GitHubProfileComparison,
  user2: GitHubProfileComparison
): Promise<{ analysis: string }> => {
  const { data } = await axios.post(`${API_BASE}/api/ai/compare`, {
    user1,
    user2,
  });
  return data;
};

export const analyzeJobDescription = async (
  text: string
): Promise<string> => {
  const { data } = await axios.post(`${API_BASE}/api/ai/job`, {
    text,
  });

  return data.data ?? data;
};

export const analyzeGitHubProfile = async (
  username: string
): Promise<ProfileAnalysisResult> => {
  const { data } = await axios.post(
    `${API_BASE}/api/user/${username}/analyze`
  );

  return data.data ?? data;
};

export const match = async (
  jobSummary: string,
  profileAnalysis: ProfileAnalysisResult
): Promise<MatchResult> => {
  const { data } = await axios.post(`${API_BASE}/api/ai/match`, {
    jobSummary,
    profileAnalysis,
  });
  return data.data ?? data;
};