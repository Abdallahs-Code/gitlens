"use client";

import axios from "axios";
import { flushSync } from "react-dom";
import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GitHubProfile, GitHubRepo, Thought } from "@/lib/types";
import { fetchUserData, fetchThoughts, addThought, formatDate, summarizeProfile, setGeminiKey } from "@/lib/api/api.client";
import { Frown, MessageSquare, Sparkles, GitCompare, Briefcase, Scissors, ChevronDown, ChevronUp, Star, GitFork, Code2 } from "lucide-react";

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
  const [thoughtsPaginationLoading, setThoughtsPaginationLoading] = useState(false);
  const [thoughtsNewestTimestamp, setThoughtsNewestTimestamp] = useState<string | null>(null);
  const [thoughtsOldestTimestamp, setThoughtsOldestTimestamp] = useState<string | null>(null);
  const thoughtsScrollRef = useRef<HTMLDivElement>(null);

  const [repoThoughts, setRepoThoughts] = useState<{ [repoName: string]: Thought[] }>({});
  const [repoPaginationLoading, setRepoPaginationLoading] = useState<{ [repoName: string]: boolean }>({});
  const [repoNewestTimestamp, setRepoNewestTimestamp] = useState<{ [repoName: string]: string | null }>({});
  const [repoOldestTimestamp, setRepoOldestTimestamp] = useState<{ [repoName: string]: string | null }>({});
  const repoScrollRefs = useRef<{ [repoName: string]: HTMLDivElement | null }>({});

  const [userThoughtContent, setUserThoughtContent] = useState("");
  const [repoThoughtContents, setRepoThoughtContents] = useState<{ [repoName: string]: string }>({});

  const [userThoughtLoading, setUserThoughtLoading] = useState(false);
  const [repoThoughtLoading, setRepoThoughtLoading] = useState<{ [repoName: string]: boolean }>({});

  const [thoughtsTotal, setThoughtsTotal] = useState<number | null>(null);
  const [repoThoughtsTotal, setRepoThoughtsTotal] = useState<{ [repoName: string]: number | null }>({});

  const [showThoughts, setShowThoughts] = useState(false);
  const [showRepoThoughts, setShowRepoThoughts] = useState<{ [repoName: string]: boolean }>({});

  const userNeedsFallbackRef = useRef(false);
  const repoNeedsFallbackRef = useRef<{ [repoName: string]: boolean }>({});
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const [displayedSummary, setDisplayedSummary] = useState<string>("");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [typingDone, setTypingDone] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [compareLoading, setCompareLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);

  const [navigatingUser, setNavigatingUser] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!urlUsername) return;

      setIsLoading(true);
      setError(null);
      setThoughtsLoading(true);
      setThoughtsError(null);

      try {
        const data = await fetchUserData(urlUsername);
        setProfile(data.profile);
        setRepos(data.repos);
        setUsername(data.profile.login);

        try {
          const { thoughts: thoughtsData, total } = await fetchThoughts(data.profile.login, undefined, undefined, undefined, true);
          setThoughts(thoughtsData);
          setThoughtsTotal(total);
          if (thoughtsData.length > 0) {
            setThoughtsNewestTimestamp(thoughtsData[0].created_at);
            setThoughtsOldestTimestamp(thoughtsData[thoughtsData.length - 1].created_at);
          }

          const repoThoughtsResults = await Promise.all(
            data.repos.map(async (repo) => {
              const { thoughts: fetched, total } = await fetchThoughts(data.profile.login, undefined, undefined, repo.name);
              return { repoName: repo.name, fetched, total };
            })
          );

          const newRepoThoughts: { [repoName: string]: Thought[] } = {};
          const newRepoTotals: { [repoName: string]: number | null } = {};
          const newRepoNewest: { [repoName: string]: string | null } = {};
          const newRepoOldest: { [repoName: string]: string | null } = {};

          for (const { repoName, fetched, total } of repoThoughtsResults) {
            newRepoThoughts[repoName] = fetched;
            newRepoTotals[repoName] = total;
            if (fetched.length > 0) {
              newRepoNewest[repoName] = fetched[0].created_at;
              newRepoOldest[repoName] = fetched[fetched.length - 1].created_at;
            }
          }

          setRepoThoughts(newRepoThoughts);
          setRepoThoughtsTotal(newRepoTotals);
          setRepoNewestTimestamp(newRepoNewest);
          setRepoOldestTimestamp(newRepoOldest);

        } catch (err) {
          setThoughtsError("Error loading community thoughts");
          console.error(err);
        } finally {
          setThoughtsLoading(false);
        }

      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message: string = err.response?.data?.error ?? "Something went wrong";
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

  const checkNeedsFallback = useCallback((key: 'user' | string, el: HTMLDivElement | null) => {
    if (!el) return;
    const fallback = el.scrollHeight <= el.clientHeight;
    if (key === 'user') {
      userNeedsFallbackRef.current = fallback;
    } else {
      repoNeedsFallbackRef.current = { ...repoNeedsFallbackRef.current, [key]: fallback };
    }
    forceUpdate();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      checkNeedsFallback('user', thoughtsScrollRef.current);
    });
  }, [thoughts]);

  useEffect(() => {
    requestAnimationFrame(() => {
      Object.entries(repoScrollRefs.current).forEach(([repoName, el]) => {
        checkNeedsFallback(repoName, el);
      });
    });
  }, [repoThoughts]);

  useEffect(() => {
    const handleResize = () => {
      checkNeedsFallback('user', thoughtsScrollRef.current);
      Object.entries(repoScrollRefs.current).forEach(([repoName, el]) => {
        checkNeedsFallback(repoName, el);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkNeedsFallback]);

  const handleToggleRepoThoughts = (repoName: string) => {
    const next = !showRepoThoughts[repoName];
    flushSync(() => setShowRepoThoughts((prev) => ({ ...prev, [repoName]: next })));
    if (next) {
      checkNeedsFallback(repoName, repoScrollRefs.current[repoName]);
    }
  };

  const loadOlderThoughts = async () => {
    if (!username || !thoughtsOldestTimestamp || thoughtsPaginationLoading) return;
    setThoughtsPaginationLoading(true);
    try {
      const { thoughts: fetched, total } = await fetchThoughts(username, thoughtsOldestTimestamp, 'older', undefined, true);
      if (fetched.length > 0) {
        setThoughts((prev) => [...prev, ...fetched]);
        setThoughtsOldestTimestamp(fetched[fetched.length - 1].created_at);
        setThoughtsTotal(total);
      }
    } catch (err) {
      console.error('Failed to load older thoughts:', err);
    } finally {
      setThoughtsPaginationLoading(false);
    }
  };

  const loadNewerThoughts = async () => {
    if (!username || !thoughtsNewestTimestamp || thoughtsPaginationLoading) return;
    setThoughtsPaginationLoading(true);
    try {
      const { thoughts: fetched, total } = await fetchThoughts(username, thoughtsNewestTimestamp, 'newer', undefined, true);
      if (fetched.length > 0) {
        const reversed = [...fetched].reverse();
        setThoughts((prev) => [...reversed, ...prev]);
        setThoughtsNewestTimestamp(reversed[0].created_at);
        setThoughtsTotal(total);
      }
    } catch (err) {
      console.error('Failed to load newer thoughts:', err);
    } finally {
      setThoughtsPaginationLoading(false);
    }
  };

  const handleThoughtsScroll = () => {
    const el = thoughtsScrollRef.current;
    if (!el || thoughtsPaginationLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
      loadOlderThoughts();
    } else if (el.scrollTop === 0) {
      loadNewerThoughts();
    }
  };

  const loadOlderRepoThoughts = async (repoName: string) => {
    const oldest = repoOldestTimestamp[repoName];
    if (!username || !oldest || repoPaginationLoading[repoName]) return;
    setRepoPaginationLoading((prev) => ({ ...prev, [repoName]: true }));
    try {
      const { thoughts: fetched, total } = await fetchThoughts(username, oldest, 'older', repoName);
      if (fetched.length > 0) {
        setRepoThoughts((prev) => ({ ...prev, [repoName]: [...(prev[repoName] ?? []), ...fetched] }));
        setRepoOldestTimestamp((prev) => ({ ...prev, [repoName]: fetched[fetched.length - 1].created_at }));
        setRepoThoughtsTotal((prev) => ({ ...prev, [repoName]: total }));
      }
    } catch (err) {
      console.error('Failed to load older repo thoughts:', err);
    } finally {
      setRepoPaginationLoading((prev) => ({ ...prev, [repoName]: false }));
    }
  };

  const loadNewerRepoThoughts = async (repoName: string) => {
    const newest = repoNewestTimestamp[repoName];
    if (!username || !newest || repoPaginationLoading[repoName]) return;
    setRepoPaginationLoading((prev) => ({ ...prev, [repoName]: true }));
    try {
      const { thoughts: fetched, total } = await fetchThoughts(username, newest, 'newer', repoName);
      if (fetched.length > 0) {
        const reversed = [...fetched].reverse();
        setRepoThoughts((prev) => ({ ...prev, [repoName]: [...reversed, ...(prev[repoName] ?? [])] }));
        setRepoNewestTimestamp((prev) => ({ ...prev, [repoName]: reversed[0].created_at }));
        setRepoThoughtsTotal((prev) => ({ ...prev, [repoName]: total }));
      }
    } catch (err) {
      console.error('Failed to load newer repo thoughts:', err);
    } finally {
      setRepoPaginationLoading((prev) => ({ ...prev, [repoName]: false }));
    }
  };

  const handleRepoThoughtsScroll = (repoName: string) => {
    const el = repoScrollRefs.current[repoName];
    if (!el || repoPaginationLoading[repoName]) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
      loadOlderRepoThoughts(repoName);
    } else if (el.scrollTop === 0) {
      loadNewerRepoThoughts(repoName);
    }
  };

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

      if (repoName) {
        const { thoughts: fetched, total } = await fetchThoughts(username, undefined, undefined, repoName);
        setRepoThoughts((prev) => ({ ...prev, [repoName]: fetched }));
        setRepoThoughtsTotal((prev) => ({ ...prev, [repoName]: total }));
        if (fetched.length > 0) {
          setRepoNewestTimestamp((prev) => ({ ...prev, [repoName]: fetched[0].created_at }));
          setRepoOldestTimestamp((prev) => ({ ...prev, [repoName]: fetched[fetched.length - 1].created_at }));
        }
        setRepoThoughtContents((prev) => ({ ...prev, [repoName]: "" }));
      } else {
        const { thoughts: updatedThoughts, total } = await fetchThoughts(username, undefined, undefined, undefined, true);
        setThoughts(updatedThoughts);
        setThoughtsTotal(total);
        if (updatedThoughts.length > 0) {
          setThoughtsNewestTimestamp(updatedThoughts[0].created_at);
          setThoughtsOldestTimestamp(updatedThoughts[updatedThoughts.length - 1].created_at);
        }
        setUserThoughtContent("");
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
    setSummaryExpanded(true);

    try {
      const summary = await summarizeProfile(profile, repos);

      setDisplayedSummary(summary.slice(0, 1));
      let i = 1;
      const interval = setInterval(() => {
        if (i < summary.length) {
          setDisplayedSummary(summary.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, 18);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: string } } }).response;
      const code = response?.status;
      const message = response?.data?.error || 'Something went wrong.';

      if (code === 429) {
        setSummaryError(`${message} Try again later or get a new `);
      } else if (code === 401) {
        setSummaryError(`${message} Get a new `);
      } else if (code === 400) {
        setSummaryError(`${message} Set a `);
      } else {
        setSummaryError(message);
      }
      setTypingDone(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCompare = () => {
    setCompareLoading(true);
    router.push(`/user/${username}/compare`);
  };

  const handleMatch = () => {
    setMatchLoading(true);
    router.push(`/user/${username}/match`);
  };

  const handleUserNavigation = (targetUsername: string) => {
    const trimmed = targetUsername.trim();
    if (!trimmed || trimmed === username) return;
    setNavigatingUser(trimmed);
    router.push(`/user/${trimmed}`);
  };

  const handleSetKey = async () => {
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    try {
      const success = await setGeminiKey(keyInput.trim());
      if (success) {
        setShowKeyModal(false);
        setKeyInput('');
      }
    } finally {
      setKeyLoading(false);
    }
  };

  const renderScrollableThoughts = (
    thoughtList: Thought[],
    scrollRef: React.RefObject<HTMLDivElement | null> | ((el: HTMLDivElement | null) => void),
    onScroll: () => void,
    paginationLoading: boolean,
    loadNewer: () => void,
    loadOlder: () => void,
    newestTs: string | null,
    oldestTs: string | null,
    fallback: boolean
  ) => (
    <div className="relative rounded-xl">
      {paginationLoading && (
        <div className="absolute inset-0 bg-surface/60 z-10 flex items-center justify-center rounded-xl pointer-events-none">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      )}

      <div className="flex flex-col">
        {fallback && !paginationLoading && (
          <button
            onClick={loadNewer}
            disabled={paginationLoading || !newestTs}
            className="w-full disabled:opacity-30 cursor-pointer"
            style={{ lineHeight: 0, display: 'block' }}
          >
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-4 text-accent" style={{ display: 'block' }}>
              <polygon points="86,13.5 100,6 114,13.5" fill="currentColor" />
              <polyline points="60,12 90,12 100,8 110,12 140,12" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef as React.RefObject<HTMLDivElement>}
          onScroll={onScroll}
          className={`bg-surface rounded-xl overflow-y-auto transition-opacity ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}
          style={{ maxHeight: '240px' }}
        >
          <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
            {thoughtList.map((thought, index) => (
              <div key={thought.created_at} className={index !== thoughtList.length - 1 ? "pb-3 sm:pb-4 border-b border-border" : ""}>
                <div className="flex items-start gap-3">
                  <img
                    src={thought.users.avatar_url}
                    alt={thought.users.username}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full mt-1 shrink-0"
                    style={{
                      border: '1px solid var(--color-border)',
                      cursor: navigatingUser === thought.users.username ? 'wait' : 'pointer'
                    }}
                    onClick={() => handleUserNavigation(thought.users.username)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="font-medium text-text-primary hover:underline text-xs sm:text-base"
                        style={{ cursor: navigatingUser === thought.users.username ? 'wait' : 'pointer' }}
                        onClick={() => handleUserNavigation(thought.users.username)}
                      >
                        {thought.users.username}
                      </span>
                      <span className="text-[10px] sm:text-xs text-text-muted shrink-0">{formatDate(thought.created_at)}</span>
                    </div>
                    <p className="text-text-secondary text-xs sm:text-sm">{thought.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fallback && !paginationLoading && (
          <button
            onClick={loadOlder}
            disabled={paginationLoading || !oldestTs}
            className="w-full disabled:opacity-30 cursor-pointer"
            style={{ lineHeight: 0, display: 'block' }}
          >
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-4 text-accent" style={{ display: 'block' }}>
              <polygon points="86,6.5 100,14 114,6.5" fill="currentColor" />
              <polyline points="60,8 90,8 100,12 110,8 140,8" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

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
    <div className="relative">
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-3xl shadow-xl p-8 max-w-md w-full mx-4" style={{ border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold text-text-primary">Gemini API Key</h2>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-text-muted hover:text-text-primary text-xl leading-none cursor-pointer">✕</button>
            </div>
            <p className="text-text-secondary text-sm mb-5">
              To use AI features, provide your Gemini API key. You can get one at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Google AI Studio
              </a>.
            </p>
            <input
              type="text"
              placeholder="Paste your Gemini API key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="input-field w-full mb-3 !py-1.5 !text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowKeyModal(false)} className="btn-dark flex-1 !py-1.5 !text-sm">
                Skip for now
              </button>
              <button
                onClick={handleSetKey}
                disabled={keyLoading || !keyInput.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 !py-1.5 !text-sm"
              >
                {keyLoading ? (
                  <span className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={showKeyModal ? 'blur-sm pointer-events-none select-none' : ''}>
        <div className="flex flex-col min-h-screen overflow-x-hidden bg-surface">
          <main className="mt-4 p-4 sm:p-6 pt-6 max-w-full sm:max-w-4xl mx-auto bg-background shadow-md rounded-3xl mb-6 px-4 sm:px-6"
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
              <div className="flex flex-nowrap gap-1.5 sm:gap-4 justify-end px-2 sm:px-0 sm:ml-12">
                <button
                  onClick={handleSummarize}
                  disabled={summaryLoading || !typingDone && displayedSummary !== ""}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 sm:gap-2 !px-3 sm:!px-6 !text-sm sm:!text-base"
                  >
                  <Scissors className="w-4 h-4" />
                  {summaryLoading ? (
                    <span className="flex gap-1 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    "Summarize"
                  )}
                </button>
                <button
                  onClick={handleCompare}
                  disabled={compareLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 sm:gap-2 !px-3 sm:!px-6 !text-sm sm:!text-base"
                >
                  <GitCompare className="w-4 h-4" />
                  {compareLoading ? (
                    <span className="flex gap-1 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    "Compare"
                  )}
                </button>
                <button
                  onClick={handleMatch}
                  disabled={matchLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 sm:gap-2 !px-3 sm:!px-6 !text-sm sm:!text-base"
                >
                  <Briefcase className="w-4 h-4" />
                  {matchLoading ? (
                    <span className="flex gap-1 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    "Match"
                  )}
                </button>
              </div>
            </div>

            {(displayedSummary || summaryLoading || summaryError) && (
              <div
                className="rounded-2xl overflow-hidden mb-6"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
                >
                  <span className="flex items-center gap-2 font-semibold text-text-primary">
                    <Sparkles className="w-4 h-4 text-accent" />
                    AI Summary
                  </span>
                  {summaryExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>

                {summaryExpanded && (
                  <div className="px-4 py-4 bg-background">
                    {summaryLoading ? (
                      <div className="flex items-center gap-3 text-text-secondary text-sm">
                        <span className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                        </span>
                      </div>
                    ) : summaryError ? (
                      <p className="text-text-muted text-sm italic">
                        {summaryError}
                        {(summaryError.endsWith('get a new ') || summaryError.endsWith('Get a new ') || summaryError.endsWith('Set a ')) && (
                          <button onClick={() => setShowKeyModal(true)} className="text-accent underline cursor-pointer hover:text-accent-hover">
                            key
                          </button>
                        )}
                      </p>
                    ) : displayedSummary ? (
                      <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                        {displayedSummary}
                        {!typingDone && (
                          <span className="inline-block w-0.5 h-4 ml-0.5 bg-text-secondary align-middle animate-pulse" />
                        )}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <section className="mt-8">
              <div className="flex justify-center sm:justify-start">
                <button
                  onClick={() => {
                    flushSync(() => setShowThoughts((prev) => !prev));
                    checkNeedsFallback('user', thoughtsScrollRef.current);
                  }}
                  className="btn-white text-sm text-center mb-3 flex items-center justify-center gap-2"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-black fill-current" />
                    {showThoughts ? "Hide" : "Thoughts"}
                  </span>
                  <span className="bg-accent text-black text-xs px-2 py-0.5 rounded-full">
                    {thoughtsTotal}
                  </span>
                </button>
              </div>

              {showThoughts && (
                <div className="flex flex-col gap-3">
                  {thoughtsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  ) : thoughtsError ? (
                    <p className="text-error">{thoughtsError}</p>
                  ) : thoughts.length === 0 ? (
                    <div className="bg-surface rounded-xl py-6 flex items-center justify-center" style={{ border: '1px solid var(--color-border)' }}>
                      <p className="text-text-muted text-sm">No thoughts yet.</p>
                    </div>
                  ) : renderScrollableThoughts(
                      thoughts,
                      thoughtsScrollRef,
                      handleThoughtsScroll,
                      thoughtsPaginationLoading,
                      loadNewerThoughts,
                      loadOlderThoughts,
                      thoughtsNewestTimestamp,
                      thoughtsOldestTimestamp,
                      userNeedsFallbackRef.current
                    )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddThought(null);
                    }}
                    className="mt-1 flex flex-row space-x-2"
                  >
                    <input
                      type="text"
                      value={userThoughtContent}
                      onChange={(e) => setUserThoughtContent(e.target.value)}
                      placeholder="Add something..."
                      className="input-field flex-1 !py-1.5 !text-sm"
                    />
                    <button
                      type="submit"
                      disabled={userThoughtLoading}
                      className="btn-primary disabled:opacity-50 !py-1.5 !text-sm"
                    >
                      {userThoughtLoading ? (
                        <span className="flex gap-1 items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                        </span>
                      ) : "Share"}
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
                  <div className="flex flex-row justify-between items-center mt-2 w-full">
                    <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" /> {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5" /> {repo.forks_count} 
                      </span>
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5" /> {repo.language}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleRepoThoughts(repo.name)}
                      className="btn-white text-sm text-center flex items-center justify-center gap-2"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-black fill-current" />
                        {showRepoThoughts[repo.name] ? "Hide" : <span className="hidden sm:inline">Thoughts</span>}
                      </span>
                      <span className="bg-accent text-black text-xs px-2 py-0.5 rounded-full">
                        {repoThoughtsTotal[repo.name]}
                      </span>
                    </button>
                  </div>

                  {showRepoThoughts[repo.name] && (
                    <div className="mt-3 flex flex-col gap-3">
                      {repoPaginationLoading[repo.name] && !(repoThoughts[repo.name]?.length) ? (
                        <div className="flex items-center justify-center py-8">
                          <span className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                          </span>
                        </div>
                      ) : (repoThoughts[repo.name] ?? []).length === 0 ? (
                        <div className="bg-surface rounded-xl py-6 flex items-center justify-center" style={{ border: '1px solid var(--color-border)' }}>
                          <p className="text-text-muted text-sm">No thoughts yet.</p>
                        </div>
                      ) : renderScrollableThoughts(
                          repoThoughts[repo.name],
                          (el) => { repoScrollRefs.current[repo.name] = el; },
                          () => handleRepoThoughtsScroll(repo.name),
                          repoPaginationLoading[repo.name] ?? false,
                          () => loadNewerRepoThoughts(repo.name),
                          () => loadOlderRepoThoughts(repo.name),
                          repoNewestTimestamp[repo.name] ?? null,
                          repoOldestTimestamp[repo.name] ?? null,
                          repoNeedsFallbackRef.current[repo.name] ?? false
                        )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddThought(repo.name);
                        }}
                        className="flex flex-row space-x-2"
                      >
                        <input
                          type="text"
                          value={repoThoughtContents[repo.name] || ""}
                          onChange={(e) =>
                            setRepoThoughtContents((prev) => ({ ...prev, [repo.name]: e.target.value }))
                          }
                          placeholder="Add something..."
                          className="input-field flex-1 !py-1.5 !text-sm"
                        />
                        <button
                          type="submit"
                          disabled={repoThoughtLoading[repo.name]}
                          className="btn-primary disabled:opacity-50 !py-1.5 !text-sm"
                        >
                          {repoThoughtLoading[repo.name] ? (
                            <span className="flex gap-1 items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                            </span>
                          ) : "Share"}
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 mb-2 text-center">
              <button
                onClick={() => { setNavigating(true); router.push('/'); }}
                disabled={navigating}
                className="btn-dark sm:w-auto disabled:opacity-50"
                style={{ cursor: navigating ? 'wait' : 'pointer' }}
                suppressHydrationWarning
              >
                Return to home page
              </button>
            </div>
          </main>
          <footer className="mt-auto bg-footer border-t border-border py-4 w-full">
            <div className="max-w-4xl mx-auto text-center text-sm text-text-muted px-4">
              © {new Date().getFullYear()} GitLens Community. All rights reserved.
            </div>
          </footer>
        </div>
      </div>
    </div> 
  );
}