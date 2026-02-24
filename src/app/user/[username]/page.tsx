"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GitHubProfile, GitHubRepo, Thought } from "@/lib/types";
import { Frown, MessageSquare, Sparkles, GitCompare, Briefcase } from "lucide-react";
import { fetchUserData, fetchThoughts, addThought, formatDate, summarizeProfile } from "@/lib/api.shared";

export default function UserProfilePage() {
  const { username: urlUsername } = useParams<{ username: string }>();
  const [username, setUsername] = useState<string>("");

  const router = useRouter();

  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [thoughtsLoading, setThoughtsLoading] = useState(true);
  const [thoughtsError, setThoughtsError] = useState<string | null>(null);

  const [userThoughtContent, setUserThoughtContent] = useState("");
  const [repoThoughtContents, setRepoThoughtContents] = useState<{ [repoName: string]: string }>({});

  const [userThoughtLoading, setUserThoughtLoading] = useState(false);
  const [repoThoughtLoading, setRepoThoughtLoading] = useState<{ [repoName: string]: boolean }>({});

  const [displayedSummary, setDisplayedSummary] = useState<string>("");
  const [typingDone, setTypingDone] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [showThoughts, setShowThoughts] = useState(false);
  const [showRepoThoughts, setShowRepoThoughts] = useState<{ [repoName: string]: boolean }>({});

  const [compareLoading, setCompareLoading] = useState(false);
  const [jobFitLoading, setJobFitLoading] = useState(false);

  const [thoughtsPage, setThoughtsPage] = useState(0);
  const [repoThoughtsPage, setRepoThoughtsPage] = useState<{ [repoName: string]: number }>({});

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
    const loadThoughts = async () => {
      if (!username) return;

      setThoughtsLoading(true);
      setThoughtsError(null);
      try {
        const data = await fetchThoughts(username);
        setThoughts(data);
      } catch (err) {
        setThoughtsError("Error loading community thoughts");
        console.error(err);
      } finally {
        setThoughtsLoading(false);
      }
    };

    loadThoughts();
  }, [username]);

  const handleAddThought = async (repoName: string | null = null) => {
    const content = repoName ? repoThoughtContents[repoName] : userThoughtContent;
    if (!content?.trim()) return;

    if (repoName) {
      setRepoThoughtLoading((prev) => ({ ...prev, [repoName]: true }));
    } else {
      setUserThoughtLoading(true);
    }

    try {
      await addThought({ username, repo_name: repoName, content });

      const updatedThoughts = await fetchThoughts(username);
      setThoughts(updatedThoughts);

      if (repoName) {
        setRepoThoughtContents((prev) => ({ ...prev, [repoName]: "" }));
        setRepoThoughtsPage((prev) => ({ ...prev, [repoName]: 0 }));
      } else {
        setUserThoughtContent("");
        setThoughtsPage(0);
      }
    } catch (err) {
      console.error("Error adding your thought:", err);
    } finally {
      if (repoName) {
        setRepoThoughtLoading((prev) => ({ ...prev, [repoName]: false }));
      } else {
        setUserThoughtLoading(false);
      }
    }
  };

  const handleSummarize = async () => {
    if (!profile || !repos) return;

    setSummaryLoading(true);
    setSummaryError(null);
    setDisplayedSummary("");
    setTypingDone(false);

    try {
      const summary = await summarizeProfile(profile, repos);

      let i = 0;
      const interval = setInterval(() => {
        if (i < summary.length) {
          setDisplayedSummary(summary.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, 18);
    } catch (err) {
      setSummaryError("Failed to generate summary. Try again later.");
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCompare = () => {
    setCompareLoading(true);
    router.push(`/user/${username}/compare`);
  };

  const handleJobFit = () => {
    setJobFitLoading(true);
    router.push(`/user/${username}/job-fit`);
  };

  const renderPaginatedThoughts = (
    filtered: Thought[],
    page: number,
    setPage: (fn: (p: number) => number) => void
  ) => {
    const perPage = 3;
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const totalPages = Math.ceil(sorted.length / perPage);
    const visible = sorted.slice(page * perPage, page * perPage + perPage);

    return (
      <div className="flex flex-col gap-3">
        <div className="bg-surface rounded-xl flex flex-col gap-0 overflow-hidden px-4" style={{ border: '1px solid var(--color-border)' }}>
          {visible.map((thought, index) => (
            <div
              key={index}
              className={`py-3 ${index !== visible.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={thought.users.avatar_url}
                  alt={thought.users.username}
                  className="w-8 h-8 rounded-full mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary text-sm">{thought.users.username}</span>
                    <span className="text-xs text-text-muted shrink-0">{formatDate(thought.created_at)}</span>
                  </div>
                  <p className="text-text-secondary text-sm">{thought.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm text-text-muted disabled:opacity-30 hover:text-accent transition-colors cursor-pointer"
            >
              ← Newer
            </button>
            <span className="text-xs text-text-muted">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-sm text-text-muted disabled:opacity-30 hover:text-accent transition-colors cursor-pointer"
            >
              Older →
            </button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 flex justify-center"
                style={{ transform: `rotate(${i * (360 / 8)}deg)` }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '24px',
                    borderRadius: '2px',
                    marginTop: '0px',
                    backgroundColor: '#0fffff',
                    opacity: (i + 1) / 8,
                    animation: `radialFade 0.8s linear infinite`,
                    animationDelay: `${(i / 8) - 0.8}s`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes radialFade {
            0%   { opacity: 0.08; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

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
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-surface">
      <main className="mt-4 p-4 sm:p-6 max-w-full sm:max-w-4xl mx-auto bg-background shadow-md rounded-3xl mb-6 px-4 sm:px-6"
        style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mb-6 space-y-4 sm:space-y-0">
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-20 h-20 rounded-full"
            style={{ border: '2px solid var(--color-border)' }}
          />
          <div className="text-center sm:text-left">
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
          <div className="flex flex-wrap gap-4 justify-end px-4 sm:px-0 sm:ml-12">
            <button
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="btn-primary flex-1 sm:flex-none sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {summaryLoading ? "Summarizing..." : "Summarize"}
            </button>
            <button
              onClick={handleCompare}
              disabled={compareLoading}
              className="btn-primary flex-1 sm:flex-none sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              {compareLoading ? "Redirecting..." : "Compare"}
            </button>
            <button
              onClick={handleJobFit}
              disabled={jobFitLoading}
              className="btn-primary flex-1 sm:flex-none sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              {jobFitLoading ? "Redirecting..." : "Match"}
            </button>
          </div>
        </div>

        {displayedSummary && (
          <section className="mb-6 p-4 bg-surface rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-2 text-text-primary text-center sm:text-left">AI Summary</h2>
            <p className="text-text-secondary whitespace-pre-wrap">
              {displayedSummary}
              {!typingDone && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-text-secondary align-middle animate-pulse" />
              )}
            </p>
          </section>
        )}

        {summaryError && (
          <div className="mb-6 p-4 bg-surface rounded-lg" style={{ border: '1px solid var(--color-error)' }}>
            <p className="text-error">{summaryError}</p>
          </div>
        )}

        <section className="mt-8">
          <button
            onClick={() => setShowThoughts((prev) => !prev)}
            className="btn-white w-full sm:w-auto text-sm text-center mb-3 flex items-center justify-center gap-2"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-black fill-current" />
              {showThoughts ? "Hide" : "Thoughts"}
            </span>
            <span className="bg-accent text-black text-xs px-2 py-0.5 rounded-full">
              {thoughts.filter((thought) => thought.repo_name === null).length}
            </span>
          </button>

          {showThoughts && (
            <div className="flex flex-col gap-3">
              {thoughtsLoading && <p className="text-text-secondary">Loading thoughts...</p>}
              {thoughtsError && <p className="text-error">{thoughtsError}</p>}

              {!thoughtsLoading && !thoughtsError && (() => {
                const filtered = thoughts.filter((t) => t.repo_name === null);
                return filtered.length > 0
                  ? renderPaginatedThoughts(filtered, thoughtsPage, setThoughtsPage)
                  : <div className="bg-surface rounded-xl py-6 flex items-center justify-center" style={{ border: '1px solid var(--color-border)' }}>
                      <p className="text-text-muted text-sm">No thoughts yet.</p>
                    </div>;
              })()}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddThought(null);
                }}
                className="mt-1 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={userThoughtContent}
                  onChange={(e) => setUserThoughtContent(e.target.value)}
                  placeholder="Add something..."
                  className="input-field w-full sm:w-auto !py-1.5 !text-sm"
                />
                <button
                  type="submit"
                  disabled={userThoughtLoading}
                  className="btn-primary w-full sm:w-auto disabled:opacity-50 !py-1.5 !text-sm"
                >
                  {userThoughtLoading ? "Sharing..." : "Share"}
                </button>
              </form>
            </div>
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
                    setShowRepoThoughts((prev) => ({ ...prev, [repo.name]: !prev[repo.name] }))
                  }
                  className="btn-white w-full sm:w-auto text-sm text-center flex items-center justify-center gap-2"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-black fill-current" />
                    {showRepoThoughts[repo.name] ? "Hide" : "Thoughts"}
                  </span>
                  <span className="bg-accent text-black text-xs px-2 py-0.5 rounded-full">
                    {thoughts.filter((thought) => thought.repo_name === repo.name).length}
                  </span>
                </button>
              </div>

              {showRepoThoughts[repo.name] && (
                <div className="mt-3 flex flex-col gap-3">
                  {!thoughtsLoading && (() => {
                    const filtered = thoughts.filter((t) => t.repo_name === repo.name);
                    const page = repoThoughtsPage[repo.name] ?? 0;
                    const setPage = (fn: (p: number) => number) =>
                      setRepoThoughtsPage((prev) => ({ ...prev, [repo.name]: fn(prev[repo.name] ?? 0) }));
                    return filtered.length > 0
                      ? renderPaginatedThoughts(filtered, page, setPage)
                      : <div className="bg-surface rounded-xl py-6 flex items-center justify-center" style={{ border: '1px solid var(--color-border)' }}>
                          <p className="text-text-muted text-sm">No thoughts yet.</p>
                        </div>;
                  })()}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddThought(repo.name);
                    }}
                    className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
                  >
                    <input
                      type="text"
                      value={repoThoughtContents[repo.name] || ""}
                      onChange={(e) =>
                        setRepoThoughtContents((prev) => ({ ...prev, [repo.name]: e.target.value }))
                      }
                      placeholder="Add something..."
                      className="input-field w-full sm:w-auto !py-1.5 !text-sm"
                    />
                    <button
                      type="submit"
                      disabled={repoThoughtLoading[repo.name]}
                      className="btn-primary w-full sm:w-auto disabled:opacity-50 !py-1.5 !text-sm"
                    >
                      {repoThoughtLoading[repo.name] ? "Sharing..." : "Share"}
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
            className="btn-dark sm:w-auto"
            suppressHydrationWarning
          >
            Return to home page
          </button>
        </div>
      </main>
      <footer className="mt-auto bg-background border-t border-border py-4 w-full">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted px-4">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}