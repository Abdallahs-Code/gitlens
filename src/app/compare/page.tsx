'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { compareUsers } from '@/lib/api'; 
import { GitHubProfileComparison } from '@/types'; 

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const user1 = searchParams.get('user1') || '';
  
  const [user2Input, setUser2Input] = useState('');
  const [user1Data, setUser1Data] = useState<GitHubProfileComparison | null>(null);
  const [user2Data, setUser2Data] = useState<GitHubProfileComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');
    
    try {
      const result = await compareUsers(user1, user2Input.trim());
      const comparison = result.comparison;
      setUser1Data(comparison[user1]);
      setUser2Data(comparison[user2Input.trim()]);
    } catch (err) {
      setError('Failed to compare users. Please check the username and try again.');
      setUser1Data(null);
      setUser2Data(null);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value1, value2 }: { label: string; value1: number; value2: number }) => {
    const winner = value1 > value2 ? 1 : value1 < value2 ? 2 : 0;
    return (
      <div className="card mb-2 flex justify-between items-center">
        <span className={`flex-1 text-center ${winner === 1 ? 'font-bold text-success' : ''}`}>
          {value1.toLocaleString()}
        </span>
        <span className="flex-1 text-center font-semibold text-text-secondary">{label}</span>
        <span className={`flex-1 text-center ${winner === 2 ? 'font-bold text-success' : ''}`}>
          {value2.toLocaleString()}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      <main className="flex-grow mt-6 p-6 max-w-2xl w-full mx-auto bg-surface shadow-md rounded-lg mb-8" style={{ border: '1px solid var(--color-border)' }}>
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
              className="input-field flex-1"
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={loading || !user1}
              className="btn-primary"
              suppressHydrationWarning
            >
              {loading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
          {error && <p className="text-error mt-2">{error}</p>}
        </form>

        {user1Data && user2Data && (
          <div className="space-y-6">
            <div className="flex justify-between items-center space-x-6 mb-4">
              <div className="flex-1 text-center">
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
                {user1Data.bio && <p className="text-text-secondary mt-1">{user1Data.bio}</p>}
              </div>

              <div
                className="flex items-center justify-center text-2xl font-bold text-text-muted"
                style={{ width: '90px' }} 
              >
                VS
              </div>

              <div className="flex-1 text-center">
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
                {user2Data.bio && <p className="text-text-secondary mt-1">{user2Data.bio}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <StatCard label="Followers" value1={user1Data.followers} value2={user2Data.followers} />
              <StatCard label="Following" value1={user1Data.following} value2={user2Data.following} />
              <StatCard label="Public Repos" value1={user1Data.public_repos} value2={user2Data.public_repos} />
              <StatCard label="Total Stars" value1={user1Data.total_stars} value2={user2Data.total_stars} />
              <StatCard label="Total Commits" value1={user1Data.total_commits} value2={user2Data.total_commits} />
            </div>
          </div>
        )}
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