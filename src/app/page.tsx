'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // prevent page reload
    if (username.trim()) {
      router.push(`/user/${username.trim()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-60 p-6 bg-background text-text-primary">
      <h1 className="text-5xl font-extrabold mb-8 text-center">
        Welcome to GitLens
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
          className="btn-primary"
          suppressHydrationWarning
        >
          Search
        </button>
      </form>
    </main>
  );
}
