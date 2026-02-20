import axios from "axios";
import { 
  GitHubProfile,
  GitHubRepo, 
  GitHubProfileComparison, 
  Note, 
  JobAnalysisResult,
  ProfileAnalysisResult
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
  const { data } = await axios.get(`${API_BASE}/api/users/${username}`);
  return {
    profile: data.filteredProfile,
    repos: data.filteredRepos,
  };
};

export const fetchNotes = async (
  username: string
): Promise<Note[]> => {
  const url = `${API_BASE}/api/notes?username=${username}`;
  const { data } = await axios.get(url);
  return Array.isArray(data) ? data : data.notes;
};

export const addNote = async (
  note: { username: string; repo_name: string | null; content: string }
): Promise<Note> => {
  const { data } = await axios.post(`${API_BASE}/api/notes`, note);
  return data.note; 
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

  return date.toLocaleDateString();
};

export const compareUsers = async (
  user1: string,
  user2: string
): Promise<{ comparison: { [key: string]: GitHubProfileComparison } }> => {
  const { data } = await axios.get(
    `${API_BASE}/api/compare?user1=${user1}&user2=${user2}`
  );
  return data;
};

export const summarizeProfile = async (
  profile: GitHubProfile,
  repos: GitHubRepo[]
): Promise<string> => {
  const { data } = await axios.post(`${API_BASE}/api/summarize`, {
    profile,
    repos,
  });
  return data.summary; 
};

export const analyzeJobDescription = async (
  text: string
): Promise<JobAnalysisResult> => {
  const { data } = await axios.post(`${API_BASE}/api/analyze-job`, {
    text,
  });

  return data.data ?? data;
};

export const analyzeGitHubProfile = async (
  username: string
): Promise<ProfileAnalysisResult> => {
  const { data } = await axios.post(
    `${API_BASE}/api/users/${username}/analyze`
  );

  return data.data ?? data;
};