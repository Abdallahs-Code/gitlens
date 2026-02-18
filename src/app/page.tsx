'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { getCurrentUser, githubFlow, disconnect } from "@/lib/api.shared";

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setAuthStatus(data.status);
    } catch (error: any) {
      setAuthStatus('unauthenticated');
    }
  };

  const handleGitHubFlow = () => {
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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (username.trim()) {
      setLoading(true);
      router.push(`/user/${username.trim()}`);
    }
  };

  if (authStatus === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-text-primary">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-text-primary">
        <h1 className="flex items-center text-5xl font-extrabold mb-8 text-center gap-4">
          Welcome to GitLens
          <img src="/./favicon.ico" alt="Logo" className="w-12 h-12" />
        </h1>
        <p className="text-lg mb-8 text-center max-w-md">
          Sign in with GitHub to explore profiles and repositories
        </p>
        <button onClick={handleGitHubFlow} className="btn-primary flex items-center gap-3 text-lg px-8 py-4">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          Sign in with GitHub
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-20 p-6 bg-background text-text-primary">
      <div className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
              <span className="font-medium">Welcome, {user.username}!</span>
            </div>
          )}
        </div>
          <button
            onClick={handleDisconnect}
            className="btn-primary disabled:opacity-50"
            disabled={disconnectLoading}
          >
            {disconnectLoading ? "Disconnecting..." : "Disconnect GitHub"}
          </button>
      </div>

      <h1 className="flex items-center text-5xl font-extrabold mb-8 text-center gap-4">
        Welcome to GitLens
        <img src="/./favicon.ico" alt="Logo" className="w-12 h-12" />
      </h1>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter GitHub username"
          className="input-field"
          suppressHydrationWarning
        />
        <button
          type="submit"
          className="btn-primary disabled:opacity-50"
          suppressHydrationWarning
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
    </main>
  );
}