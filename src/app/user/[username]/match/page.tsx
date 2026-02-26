"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { MatchResult } from "@/lib/types";
import { analyzeJobDescription, analyzeGitHubProfile, match } from "@/lib/api/api.client";

const verdictStyles: Record<MatchResult["verdict"], { color: string; bg: string }> = {
  "Strong":   { color: "#00ff9d", bg: "rgba(0, 255, 157, 0.08)"  },
  "Moderate": { color: "#f5a623", bg: "rgba(245, 166, 35, 0.08)" },
  "Weak":     { color: "#ff4d4d", bg: "rgba(255, 77, 77, 0.08)"  },
};

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const handleAnalyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError(null);
    setMatchResult(null);

    try {
      const [jobResult, profileResult] = await Promise.all([
        analyzeJobDescription(jobDescription),
        analyzeGitHubProfile(username),
      ]);

      const result = await match(jobResult, profileResult);
      setMatchResult(result);
    } catch (err: any) {
      setError("Failed to analyze. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = matchResult ? verdictStyles[matchResult.verdict] : null;

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-surface">
      <main
        className="mt-4 p-4 sm:p-6 w-[45%] mx-auto bg-background shadow-md rounded-3xl mb-6 px-4 sm:px-6"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary text-center sm:text-left">
            Job Match Analysis
          </h1>
          <p className="text-text-secondary mt-2">
            Analyzing GitHub profile: <span className="text-accent">{username}</span>
          </p>
        </div>

        <section className="mb-6">
          <label
            htmlFor="jobDescription"
            className="block text-text-primary font-medium mb-2"
          >
            Job Description
          </label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={10}
            className="w-full p-4 bg-surface text-text-primary rounded-lg resize-y"
            style={{
              border: "1px solid var(--color-border)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-accent)";
              e.target.style.boxShadow = "0 0 0 2px rgba(15, 255, 255, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border)";
              e.target.style.boxShadow = "none";
            }}
          />
        </section>

        {error && (
          <div
            className="mb-6 p-4 bg-surface rounded-lg"
            style={{ border: "1px solid var(--color-error)" }}
          >
            <p className="text-error">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-center">
          <button
            onClick={handleAnalyzeMatch}
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed !py-1.5 !text-sm w-32"
          >
            {loading ? "Analyzing..." : "Analyze Match"}
          </button>
          <button
            onClick={() => router.push(`/user/${username}`)}
            className="btn-dark disabled:opacity-50 disabled:cursor-not-allowed !py-1.5 !text-sm w-32"
          >
            Back
          </button>
        </div>

        {matchResult && verdictStyle && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">Match Results</h2>

            <div
              className="p-4 rounded-lg flex items-center gap-3"
              style={{ border: `1px solid ${verdictStyle.color}`, background: verdictStyle.bg }}
            >
              <span className="text-2xl font-bold" style={{ color: verdictStyle.color }}>
                {matchResult.verdict} Match
              </span>
            </div>

            <div
              className="p-4 bg-surface rounded-lg"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-2">
                Summary
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {matchResult.explanation}
              </p>
            </div>

            {matchResult.strengths.length > 0 && (
              <div
                className="p-4 bg-surface rounded-lg"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#00ff9d" }}>
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {matchResult.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span style={{ color: "#00ff9d" }} className="mt-0.5 shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {matchResult.gaps.length > 0 && (
              <div
                className="p-4 bg-surface rounded-lg"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#ff4d4d" }}>
                  Gaps
                </h3>
                <ul className="space-y-2">
                  {matchResult.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span style={{ color: "#ff4d4d" }} className="mt-0.5 shrink-0">✗</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mt-auto bg-footer border-t border-border py-4 w-full">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted px-4">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}