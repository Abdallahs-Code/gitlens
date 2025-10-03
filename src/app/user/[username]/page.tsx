"use client";

import { useParams, useRouter } from "next/navigation";
import type { GitHubProfile, GitHubRepo, Note } from "@/types";
import { fetchUserData, fetchNotes, addNote, summarizeProfile } from "@/lib/api";
import { useState, useEffect } from "react";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
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
      if (!username) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchUserData(username);
        setProfile(data.profile);
        setRepos(data.repos);
      } catch (err) {
        setError("Error loading profile");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [username]);

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
  if (error) return <p className="p-6 text-error">{error}</p>;
  if (!profile) return <p className="p-6 text-text-primary">No data found</p>;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="mt-6 p-6 max-w-4xl mx-auto bg-surface shadow-md rounded-lg mb-8"
        style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-20 h-20 rounded-full"
            style={{ border: '2px solid var(--color-border)' }}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary">{profile.name || profile.login}</h1>
            <p className="text-text-secondary">{profile.bio}</p>
            <div className="flex space-x-4 text-sm text-text-muted mt-2">
              <span>Followers: {profile.followers}</span>
              <span>Following: {profile.following}</span>
              <span>Repos: {profile.public_repos}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCompare}
              disabled={compareLoading}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {compareLoading ? "Redirecting..." : "Compare"}
            </button>
            <button
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {summaryLoading ? "Summarizing..." : "Summarize with AI"}
            </button>
          </div>
        </div>

        {aiSummary && (
          <section className="mb-6 p-4 bg-surface rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-2 text-text-primary">AI Summary</h2>
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
            className="btn-secondary mb-4"
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
                className="mt-4 flex space-x-2"
              >
                <input
                  type="text"
                  value={userNoteContent}
                  onChange={(e) => setUserNoteContent(e.target.value)}
                  placeholder="Add something..."
                  className="input-field"
                />
                <button
                  type="submit"
                  disabled={userNoteLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {userNoteLoading ? "Adding..." : "Add"}
                </button>
              </form>
            </>
          )}
        </section>

        <h2 className="text-xl font-semibold mt-3 mb-4 text-text-primary">Repositories</h2>
        <ul className="space-y-3">
          {repos.map((repo) => (
            <li key={repo.name} className="card-compact">
              <div className="flex items-center justify-between">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-medium hover:text-accent-hover"
                >
                  {repo.name}
                </a>
                <span className="text-xs text-text-muted">
                  {formatDate(repo.updated_at)}
                </span>
              </div>
              <p className="text-text-secondary">{repo.description}</p>
              <div className="flex items-center justify-between text-sm text-text-muted mt-2">
                <div className="flex space-x-4 text-sm text-text-muted mt-2">
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                  <span>{repo.language}</span>
                </div>

                <button
                  onClick={() =>
                    setShowRepoNotes((prev) => ({ ...prev, [repo.name]: !prev[repo.name] }))
                  }
                  className="btn-secondary text-sm"
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
                    className="mt-2 flex space-x-2"
                  >
                    <input
                      type="text"
                      value={repoNoteContents[repo.name] || ""}
                      onChange={(e) =>
                        setRepoNoteContents((prev) => ({ ...prev, [repo.name]: e.target.value }))
                      }
                      placeholder="Add something..."
                      className="input-field text-sm"
                    />
                    <button
                      type="submit"
                      disabled={repoNoteLoading[repo.name]}
                      className="btn-primary text-sm disabled:opacity-50"
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
            className="btn-primary"
            suppressHydrationWarning
          >
            Return to home page
          </button>
        </div>
      </main>
      <footer className="mt-auto bg-surface border-t border-border py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
