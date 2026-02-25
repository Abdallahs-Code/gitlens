'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { compareUsers, aiCompareUsers } from '@/lib/api/api.shared';
import { Frown, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { GitHubProfileComparison } from '@/lib/types';

function CompareContent() {
  const params = useParams();
  const router = useRouter();
  const user1 = params.username as string;

  const [user2Input, setUser2Input] = useState('');
  const [user1Data, setUser1Data] = useState<GitHubProfileComparison | null>(null);
  const [user2Data, setUser2Data] = useState<GitHubProfileComparison | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [displayedAnalysis, setDisplayedAnalysis] = useState<string>('');
  const [typingDone, setTypingDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExpanded, setAiExpanded] = useState(true);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user1) {
      setError('First user not found in URL');
      return;
    }

    if (!user2Input.trim()) {
      setError('Please enter a username to compare with');
      return;
    }

    setUser1Data(null); 
    setUser2Data(null);
    setLoading(true);
    setError('');
    setAiAnalysis('');
    setDisplayedAnalysis('');
    setTypingDone(false);

    try {
      const result = await compareUsers(user1, user2Input.trim());
      const comparison = result.comparison;
      const u1 = comparison[user1];
      const u2 = comparison[user2Input.trim()];
      setUser1Data(u1);
      setUser2Data(u2);

      setAiLoading(true);
      try {
        const aiResult = await aiCompareUsers(u1, u2);
        setAiAnalysis(aiResult.analysis);
        setAiLoading(false);

        let i = 0;
        const interval = setInterval(() => {
          if (i < aiResult.analysis.length) {
            setDisplayedAnalysis(aiResult.analysis.slice(0, i + 1));
            i++;
          } else {
            clearInterval(interval);
            setTypingDone(true);
          }
        }, 18);
      } catch {
        setAiAnalysis('');
        setAiLoading(false);
      }
    } catch {
      setError('Failed to compare users. Please check the username and try again.');
      setUser1Data(null);
      setUser2Data(null);
    } finally {
      setLoading(false);
    }
  };

  const stats: { label: string; key: keyof GitHubProfileComparison }[] = [
    { label: 'Followers', key: 'followers' },
    { label: 'Following', key: 'following' },
    { label: 'Public Repos', key: 'public_repos' },
    { label: 'Total Stars', key: 'total_stars' },
    { label: 'Total Commits', key: 'total_commits' },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-surface">
      <main className="mt-6 p-6 max-w-2xl w-full mx-auto bg-background shadow-md rounded-3xl mb-8" style={{ border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          GitHub Profile Comparison
        </h1>
        {user1 && (
          <p className="text-text-secondary text-center mb-6">
            Comparing with <span className="font-semibold text-accent">@{user1}</span>
          </p>
        )}

        <form onSubmit={handleCompare} className="card mb-6">
          <label className="block mb-2 text-text-primary font-medium">
            Enter username to compare!
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={user2Input}
              onChange={(e) => setUser2Input(e.target.value)}
              placeholder="GitHub username"
              className="input-field !py-1.5 !text-sm" style={{ flex: '0 0 70%' }}
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={loading || !user1}
              className="btn-primary disabled:opacity-50 !py-1.5 !text-sm" style={{ flex: '0 0 30%' }}
              suppressHydrationWarning
            >
              {loading ? 'Comparing...' : 'Start'}
            </button>
          </div>
          {error && (
            <p className="text-error mt-2 flex items-center gap-2 text-lg">
              <Frown className="w-5 h-5" />
              {error}
            </p>
          )}
        </form>

        {user1Data && user2Data && (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <div className="flex-1 text-center pl-4">
                <img
                  src={user1Data.avatar_url}
                  alt={user1Data.login}
                  className="w-20 h-20 rounded-full mx-auto"
                  style={{ border: '2px solid var(--color-border)' }}
                />
                <h2 className="text-lg font-bold text-text-primary mt-2">
                  {user1Data.name || user1Data.login}
                </h2>
                <a
                  href={user1Data.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover"
                >
                  @{user1Data.login}
                </a>
                {user1Data.bio && <p className="text-text-secondary mt-1 text-sm">{user1Data.bio}</p>}
              </div>

              <div
                className="flex items-center justify-center text-2xl font-bold text-text-muted flex-shrink-0"
                style={{ width: '7rem' }}
              >
                VS
              </div>

              <div className="flex-1 text-center pr-4">
                <img
                  src={user2Data.avatar_url}
                  alt={user2Data.login}
                  className="w-20 h-20 rounded-full mx-auto"
                  style={{ border: '2px solid var(--color-border)' }}
                />
                <h2 className="text-lg font-bold text-text-primary mt-2">
                  {user2Data.name || user2Data.login}
                </h2>
                <a
                  href={user2Data.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover"
                >
                  @{user2Data.login}
                </a>
                {user2Data.bio && <p className="text-text-secondary mt-1 text-sm">{user2Data.bio}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {stats.map(({ label, key }) => {
                const v1 = Number(user1Data[key]) || 0;
                const v2 = Number(user2Data[key]) || 0;
                const winner = v1 > v2 ? 1 : v1 < v2 ? 2 : 0;

                return (
                  <div
                    key={key}
                    className="flex items-center rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(128,128,128,0.06)' }}
                  >
                    <span
                      className="flex-1 text-center tabular-nums transition-all"
                      style={{
                        fontSize: winner === 1 ? '1rem' : '0.85rem',
                        fontWeight: winner === 1 ? 700 : 400,
                        color: winner === 1 ? '#22c55e' : 'var(--color-text-muted)',
                      }}
                    >
                      {v1.toLocaleString()}
                    </span>

                    <span
                      className="w-28 text-center text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {label}
                    </span>

                    <span
                      className="flex-1 text-center tabular-nums transition-all"
                      style={{
                        fontSize: winner === 2 ? '1rem' : '0.85rem',
                        fontWeight: winner === 2 ? 700 : 400,
                        color: winner === 2 ? '#22c55e' : 'var(--color-text-muted)',
                      }}
                    >
                      {v2.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => setAiExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-text-primary">
                  <Sparkles className="w-4 h-4 text-accent" />
                  AI Analysis
                </span>
                {aiExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {aiExpanded && (
                <div className="px-4 py-4 bg-background">
                  {aiLoading ? (
                    <div className="flex items-center gap-3 text-text-secondary text-sm">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  ) : displayedAnalysis ? (
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                      {displayedAnalysis}
                      {!typingDone && (
                        <span className="inline-block w-0.5 h-4 ml-0.5 bg-text-secondary align-middle animate-pulse" />
                      )}
                    </p>
                  ) : aiAnalysis === '' && !aiLoading ? (
                    <p className="text-text-muted text-sm italic">
                      AI analysis unavailable at the moment.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 mb-2 text-center">
          <button
            onClick={() => router.push(`/user/${user1}`)}
            className="btn-dark w-32 disabled:opacity-50 disabled:cursor-not-allowed"
            suppressHydrationWarning
          >
            Back
          </button>
        </div>
      </main>

      <footer className="mt-auto bg-footer border-t border-border py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  );
}
