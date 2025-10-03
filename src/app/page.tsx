'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 
    if (username.trim()) {
      setLoading(true);
      router.push(`/user/${username.trim()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-60 p-6 bg-background text-text-primary">
      <h1 className="flex items-center text-5xl font-extrabold mb-8 text-center gap-4">
        Welcome to GitLens
        <img src="/./favicon.ico" alt="Logo" className="w-12 h-12" />
      </h1>

      <form 
        onSubmit={handleSearch} 
        className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md"
      >
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
