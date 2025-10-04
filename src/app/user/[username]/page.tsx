"use client";

import { useParams, useRouter } from "next/navigation";
import type { GitHubProfile, GitHubRepo, Note } from "@/types";
import { fetchUserData, fetchNotes, addNote, summarizeProfile } from "@/lib/api";
import axios from "axios";
import { Frown } from "lucide-react";
import { useState, useEffect } from "react";

export default function UserProfilePage() {
  const { username: urlUsername } = useParams<{ username: string }>();
  const [username, setUsername] = useState<string>("");

  const router = useRouter();

  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [userNoteContent, setUserNoteContent] = useState("");
  const [repoNoteContents, setRepoNoteContents] = useState<{ [repoName: string]: string }>({});

  const [userNoteLoading, setUserNoteLoading] = useState(false);
  const [repoNoteLoading, setRepoNoteLoading] = useState<{ [repoName: string]: boolean }>({});

  const [aiSummary, setAiSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [showRepoNotes, setShowRepoNotes] = useState<{ [repoName: string]: boolean }>({});

  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!urlUsername) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchUserData(urlUsername);
        setProfile(data.profile);
        setRepos(data.repos);
        setUsername(data.profile.login);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message: string =
            err.response?.data?.error ?? "Something went wrong";
          setError(message); 
        } else {
          setError("Unexpected error");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [urlUsername]);

  useEffect(() => {
    const loadNotes = async () => {
      if (!username) return;

      setNotesLoading(true);
      setNotesError(null);
      try {
        const data = await fetchNotes(username);
        setNotes(data);
      } catch (err) {
        setNotesError("Error loading community thoughts");
        console.error(err);
      } finally {
        setNotesLoading(false);
      }
    };

    loadNotes();
  }, [username]);

  const handleAddNote = async (repoName: string | null = null) => {
    const content = repoName ? repoNoteContents[repoName] : userNoteContent;
    if (!content?.trim()) return;

    if (repoName) {
      setRepoNoteLoading((prev) => ({ ...prev, [repoName]: true }));
    } else {
      setUserNoteLoading(true);
    }

    try {
      await addNote({ username, repo_name: repoName, content });

      const updatedNotes = await fetchNotes(username);
      setNotes(updatedNotes);

      if (repoName) {
        setRepoNoteContents((prev) => ({ ...prev, [repoName]: "" }));
      } else {
        setUserNoteContent("");
      }
    } catch (err) {
      console.error("Error adding your thought:", err);
    } finally {
      if (repoName) {
        setRepoNoteLoading((prev) => ({ ...prev, [repoName]: false }));
      } else {
        setUserNoteLoading(false);
      }
    }
  };

  const handleSummarize = async () => {
    if (!profile || !repos) return;

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const summary = await summarizeProfile(profile, repos);
      setAiSummary(summary);
    } catch (err) {
      setSummaryError("Failed to generate summary. Please try again.");
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  function Loader() {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-full animate-spin" style={{
            border: '4px solid #e5e7eb',
            borderTopColor: '#2563eb'
          }}></div>
          <p className="mt-4 text-base text-white text-center font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCompare = () => {
    setCompareLoading(true);
    router.push(`/compare?user1=${username}`);
  };

  if (isLoading) return <Loader />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="p-6 text-error text-2xl flex items-center justify-center gap-2">
          <Frown className="w-8 h-8" />
          {error}
        </p>
        <button
          onClick={() => router.push("/")}
          className="btn-primary w-full sm:w-auto"
        >
          Return
        </button>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="p-6 text-text-primary text-2xl flex items-center justify-center gap-2">
          <Frown className="w-8 h-8" />
          No data found
        </p>
        <button
          onClick={() => router.push("/")}
          className="btn-primary w-full sm:w-auto"
        >
          Return
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <main className="mt-4 p-4 sm:p-6 max-w-full sm:max-w-4xl mx-auto bg-surface shadow-md rounded-lg mb-6"
        style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mb-6 space-y-4 sm:space-y-0">
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-20 h-20 rounded-full"
            style={{ border: '2px solid var(--color-border)' }}
          />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-text-primary">{profile.name || profile.login}</h1>
            <p className="text-text-secondary">
              {profile.bio}
            </p>
            <div className="flex justify-center sm:justify-start flex-wrap gap-4 text-sm text-text-muted mt-2">
              <span>Followers: {profile.followers}</span>
              <span>Following: {profile.following}</span>
              <span>Repos: {profile.public_repos}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end px-4 sm:px-0">
            <button
              onClick={handleCompare}
              disabled={compareLoading}
              className="btn-primary flex-1 sm:flex-none sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {compareLoading ? "Redirecting..." : "Compare"}
            </button>
            <button
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="btn-primary flex-1 sm:flex-none sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {summaryLoading ? "Summarizing..." : "Summarize with AI"}
            </button>
          </div>
        </div>

        {aiSummary && (
          <section className="mb-6 p-4 bg-surface rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-2 text-text-primary text-center sm:text-left">AI Summary</h2>
            <p className="text-text-secondary whitespace-pre-wrap">{aiSummary}</p>
          </section>
        )}

        {summaryError && (
          <div className="mb-6 p-4 bg-surface rounded-lg" style={{ border: '1px solid var(--color-error)' }}>
            <p className="text-error">{summaryError}</p>
          </div>
        )}

        <section className="mt-8">
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            className="btn-secondary w-full sm:w-auto text-sm text-center mb-3 flex items-center justify-center gap-2"
          >
            <span>{showNotes ? "Hide" : "GitLens community thoughts"}</span>
            <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
              {notes.filter((note) => note.repo_name === null).length}
            </span>
          </button>

          {showNotes && (
            <>
              {notesLoading && <p className="text-text-secondary">Loading thoughts...</p>}
              {notesError && <p className="text-error">{notesError}</p>}

              {notes && (
                <ul className="space-y-3">
                  {notes
                    .filter((note) => note.repo_name === null)
                    .map((note) => (
                      <li
                        key={note.id}
                        className="bg-surface py-1.5 px-6 rounded text-sm text-text-primary flex justify-between items-center"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        <span>&quot;{note.content}&quot;</span>
                        <span className="text-xs text-text-muted ml-4">
                          {formatDate(note.created_at)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddNote(null);
                }}
                className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={userNoteContent}
                  onChange={(e) => setUserNoteContent(e.target.value)}
                  placeholder="Add something..."
                  className="input-field w-full sm:w-auto"
                />
                <button
                  type="submit"
                  disabled={userNoteLoading}
                  className="btn-primary w-full sm:w-auto disabled:opacity-50"
                >
                  {userNoteLoading ? "Adding..." : "Add"}
                </button>
              </form>
            </>
          )}
        </section>

        <h2 className="text-xl font-semibold mt-3 mb-4 text-text-primary text-center sm:text-left">Repositories</h2>
        <ul className="space-y-3">
          {repos.map((repo) => (
            <li key={repo.name} className="card-compact">
              <div className="flex flex-row justify-between items-center flex-wrap">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-medium hover:text-accent-hover break-words"
                >
                  {repo.name}
                </a>
                <span className="text-xs text-text-muted ml-2 whitespace-nowrap">
                  {formatDate(repo.updated_at)}
                </span>
              </div>
              <p className="text-text-secondary mt-1 break-words">{repo.description}</p>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2 sm:gap-0">
                <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                  <span>{repo.language}</span>
                </div>

                <button
                  onClick={() =>
                    setShowRepoNotes((prev) => ({ ...prev, [repo.name]: !prev[repo.name] }))
                  }
                  className="btn-secondary w-full sm:w-auto text-sm text-center flex items-center justify-center gap-2"
                >
                  <span>
                    {showRepoNotes[repo.name] ? "Hide" : "GitLens community thoughts"}
                  </span>
                  <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                    {notes.filter((note) => note.repo_name === repo.name).length}
                  </span>
                </button>
              </div>
              {showRepoNotes[repo.name] && (
                <div className="mt-3">
                  <ul className="space-y-2">
                    {notes
                      ?.filter((note) => note.repo_name === repo.name)
                      .map((note) => (
                        <li
                          key={note.id}
                          className="bg-surface py-1.5 px-6 rounded text-sm text-text-primary flex items-center w-full"
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          <span className="flex-1 min-w-0 truncate">&quot;{note.content}&quot;</span>
                          <span className="text-xs text-text-muted ml-auto whitespace-nowrap">
                            {formatDate(note.created_at)}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddNote(repo.name);
                    }}
                    className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
                  >
                    <input
                      type="text"
                      value={repoNoteContents[repo.name] || ""}
                      onChange={(e) =>
                        setRepoNoteContents((prev) => ({ ...prev, [repo.name]: e.target.value }))
                      }
                      placeholder="Add something..."
                      className="input-field w-full sm:w-auto"
                    />
                    <button
                      type="submit"
                      disabled={repoNoteLoading[repo.name]}
                      className="btn-primary w-full sm:w-auto text-sm disabled:opacity-50"
                    >
                      {repoNoteLoading[repo.name] ? "Adding..." : "Add"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-6 mb-2 text-center">
          <button
            onClick={() => router.push('/')}
            className="btn-primary sm:w-auto"
            suppressHydrationWarning
          >
            Return to home page
          </button>
        </div>
      </main>
      <footer className="mt-auto bg-surface border-t border-border py-4 w-full">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted px-4">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
