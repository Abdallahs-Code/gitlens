'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Thought } from "@/lib/types";
import { Unplug, MessageSquare, Search, Github, Newspaper, Sparkles } from "lucide-react";
import { getCurrentUser, githubFlow, disconnect, fetchThoughts, formatDate } from "@/lib/api/api.client";

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [allThoughts, setAllThoughts] = useState<Thought[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [newestTimestamp, setNewestTimestamp] = useState<string | null>(null);
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null);
  const [navigatingUser, setNavigatingUser] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserThoughts();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setAuthStatus(data.status);
    } catch (error: any) {
      setAuthStatus('unauthenticated');
    }
  };

  const loadUserThoughts = async () => {
    if (!user) return;
    setInitialLoading(true);
    try {
      const thoughts = await fetchThoughts(user.username);
      setAllThoughts(thoughts);
      if (thoughts.length > 0) {
        setNewestTimestamp(thoughts[0].created_at);
        setOldestTimestamp(thoughts[thoughts.length - 1].created_at);
      }
    } catch (error) {
      console.error('Failed to load thoughts:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadOlderThoughts = async () => {
    if (!user || !oldestTimestamp || paginationLoading) return;
    setPaginationLoading(true);
    try {
      const thoughts = await fetchThoughts(user.username, oldestTimestamp, 'older');
      if (thoughts.length > 0) {
        setAllThoughts(prev => [...prev, ...thoughts]);
        setOldestTimestamp(thoughts[thoughts.length - 1].created_at);
      }
    } catch (error) {
      console.error('Failed to load older thoughts:', error);
    } finally {
      setPaginationLoading(false);
    }
  };

  const loadNewerThoughts = async () => {
    if (!user || !newestTimestamp || paginationLoading) return;
    setPaginationLoading(true);
    try {
      const thoughts = await fetchThoughts(user.username, newestTimestamp, 'newer');
      if (thoughts.length > 0) {
        const reversed = [...thoughts].reverse(); 
        setAllThoughts(prev => [...reversed, ...prev]);
        setNewestTimestamp(reversed[0].created_at);
      }
    } catch (error) {
      console.error('Failed to load newer thoughts:', error);
    } finally {
      setPaginationLoading(false);
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || paginationLoading) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      loadOlderThoughts();
    } else if (el.scrollTop === 0) {
      loadNewerThoughts();
    }
  };

  const handleGitHubFlow = () => {
    setGithubLoading(true);
    githubFlow();
  };

  const handleDisconnect = async () => {
    setDisconnectLoading(true);
    try {
      await disconnect();
      setUser(null);
      setAuthStatus('unauthenticated');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleSearch = (searchUsername: string, setLoadingState: boolean = false, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchUsername.trim();
    if (trimmed) {
      if (setLoadingState) {
        setLoading(true);
      }
      else {
        setNavigatingUser(trimmed);
      }
      router.push(`/user/${trimmed}`);
    }
  };

  if (authStatus === 'loading') {
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

  if (authStatus === 'unauthenticated') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center -translate-y-10 p-6 bg-background text-text-primary">
        <h1 className="flex items-center text-5xl font-extrabold mb-8 text-center gap-4">
          Welcome to GitLens
          <img src="/./favicon.ico" alt="Logo" className="w-12 h-12" />
        </h1>
        <p className="text-lg mb-8 text-center max-w-md">
          Sign in with GitHub to explore profiles and repositories
        </p>
        <button onClick={handleGitHubFlow} disabled={githubLoading} className="btn-primary flex items-center gap-3 text-lg px-8 py-4 disabled:opacity-50">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          {githubLoading ? (
            <span className="flex gap-1 items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            "Sign in with GitHub"
          )}
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-background border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            <div className="flex items-center gap-3">
              <img src="/./favicon.ico" alt="Logo" className="w-9 h-9" />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-text-primary tracking-tight">GitLens</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-sm font-semibold text-text-primary">{user.username}</span>
                    <span className="text-[11px] text-text-muted">Connected via GitHub</span>
                  </div>
                  <div className="relative">
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-9 h-9 rounded-full"
                      style={{ border: '2px solid var(--color-border)' }}
                    />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                      style={{ background: "#4eff91", border: '2px solid var(--color-background)' }}
                    />
                  </div>
                </div>
              )}

              <div className="h-6 w-px bg-border hidden sm:block" />

              <button
                onClick={handleDisconnect}
                disabled={disconnectLoading}
                className="btn-primary disabled:opacity-50 flex items-center gap-2 justify-center text-sm"
              >
                <Unplug className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {disconnectLoading ? (
                    <span className="flex gap-1 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    "Disconnect"
                  )}
                </span>
              </button>
            </div>

          </div>
        </div>
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(to right, transparent, var(--color-accent), transparent)' }} />
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col gap-6 w-full lg:w-1/2">

            <section className="bg-background rounded-3xl shadow-md p-6" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold text-text-primary">Explore GitHub Profiles</h2>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const input = form.elements.namedItem("username") as HTMLInputElement;
                  handleSearch(input.value, true, e);
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  name="username"
                  placeholder="Enter GitHub username"
                  className="input-field flex-1 !py-1.5 !text-sm"
                />
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50 flex items-center gap-2 justify-center !py-1.5 !text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex gap-1 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      Search
                    </>
                  )}
                </button>
              </form>
            </section>

            <section className="bg-background rounded-3xl shadow-md p-6" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-semibold text-text-primary">Community Thoughts About You</h2>
                </div>
                <span className="text-sm text-text-muted">{allThoughts.length}</span>
              </div>

              {initialLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-text-secondary text-sm">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              ) : allThoughts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">No thoughts yet</p>
                  <p className="text-text-muted text-sm mt-2">When others leave thoughts on your profile, they'll appear here!</p>
                </div>
              ) : (() => {
                return (
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

                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className={`bg-surface rounded-xl overflow-y-auto transition-opacity ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}
                      style={{ maxHeight: '240px' }}
                    >
                      <div className="p-4 flex flex-col gap-4">
                        {allThoughts.map((thought, index) => (
                          <div key={thought.created_at} className={index !== allThoughts.length - 1 ? "pb-4 border-b border-border" : ""}>
                            <div className="flex items-start gap-3">
                              <img
                                src={thought.users.avatar_url}
                                alt={thought.users.username}
                                className="w-9 h-9 rounded-full mt-1 shrink-0"
                                style={{
                                  border: '1px solid var(--color-border)',
                                  cursor: navigatingUser === thought.users.username ? 'wait' : 'pointer'
                                }}
                                onClick={() => handleSearch(thought.users.username)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="font-medium text-text-primary hover:underline"
                                      style={{ cursor: navigatingUser === thought.users.username ? 'wait' : 'pointer' }}
                                      onClick={() => handleSearch(thought.users.username)}
                                    >
                                      {thought.users.username}
                                    </span>
                                    {thought.repo_name && (
                                      <span className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                        {thought.repo_name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-text-muted shrink-0">{formatDate(thought.created_at)}</span>
                                </div>
                                <p className="text-text-secondary text-sm">{thought.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>
          </div>

          <div className="w-full lg:w-1/2">
            <section className="bg-background rounded-3xl shadow-md p-6 h-full" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Newspaper className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold text-text-primary">What's New</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "AI Profile Summarization",
                    description: "Let AI craft a concise, human-readable summary of any GitHub profile — highlighting key contributions, activity patterns, and areas of expertise at a glance.",
                    date: "Live now",
                    badge: "AI",
                  },
                  {
                    title: "Job Match Analysis",
                    description: "Paste a job description and let AI evaluate how well a GitHub profile matches the role — ideal for recruiters, hiring managers, or developers sizing up their own readiness.",
                    date: "Live now",
                    badge: "AI",
                  },
                  {
                    title: "Explore & Ask",
                    description: "Navigate any GitHub repository like a file explorer, then chat with AI about any file you open — understand its purpose, decode complex logic, or see how it fits into the bigger picture of the project.",
                    date: "Coming soon",
                    badge: "AI",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-surface p-4 rounded-xl flex flex-col gap-1 relative"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">{item.title}</span>
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <p className="text-sm text-text-secondary">{item.description}</p>
                    <span
                      className="text-xs font-medium absolute bottom-3 right-4"
                      style={{
                        color: item.date === "Live now" ? "#4eff91" :
                              item.date === "Coming soon" ? "#22ffff" :
                              "var(--color-text-muted)"
                      }}
                    >
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </main>

      <footer className="mt-auto bg-footer border-t border-border py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-text-muted px-4">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}