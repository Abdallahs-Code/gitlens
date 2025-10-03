import axios from "axios";
import { GitHubProfile, GitHubRepo, GitHubProfileComparison, Note } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function githubFetch(url: string) {
  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  return fetch(url, { headers });
}

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
  note: Omit<Note, "id" | "created_at">
): Promise<Note> => {
  const { data } = await axios.post(`${API_BASE}/api/notes`, note);
  return data;
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