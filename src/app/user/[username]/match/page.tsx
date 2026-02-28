"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { MatchResult } from "@/lib/types";
import { analyzeJobDescription, analyzeGitHubProfile, match } from "@/lib/api/api.client";
import { Sparkles, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";

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

  const [strengthsExpanded, setStrengthsExpanded] = useState(true);
  const [gapsExpanded, setGapsExpanded] = useState(true);

  const [takeawayLoading, setTakeawayLoading] = useState(false);
  const [displayedTakeaway, setDisplayedTakeaway] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [takeawayExpanded, setTakeawayExpanded] = useState(true);

  const [navigating, setNavigating] = useState(false);

  const handleAnalyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setMatchResult(null);
    setDisplayedTakeaway("");
    setTypingDone(false);

    try {
      const [jobResult, profileResult] = await Promise.all([
        analyzeJobDescription(jobDescription),
        analyzeGitHubProfile(username),
      ]).catch(() => {
        throw new Error("gemini");
      });

      let result;
      try {
        console.log("Entering match function");
        result = await match(jobResult, profileResult);
      } catch {
        throw new Error("llm");
      }
      setMatchResult(result);

      setTakeawayLoading(true);
      const fullText = result.explanation;
      setTakeawayLoading(false);

      let i = 0;
      const interval = setInterval(() => {
        if (i < fullText.length) {
          setDisplayedTakeaway(fullText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, 18);
    } catch (err) {
      const error = err as Error;
      setError(error.message === "llm" ? "llm" : "gemini");
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = matchResult ? verdictStyles[matchResult.verdict] : null;

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-surface">
      <main
        className="mt-4 p-4 sm:p-6 w-full sm:w-[60%] mx-auto bg-background shadow-md rounded-3xl mb-6 px-4 sm:px-6"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary text-center sm:text-left">
            Job Match Analysis
          </h1>
          <p className="text-text-secondary mt-2 text-center sm:text-left">
            Analyzing GitHub profile: <span className="text-accent">{username}</span>
          </p>
        </div>

        <section className="mb-6">
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAnalyzeMatch();
              }
            }}
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
          <div className="mb-6 p-4 rounded-lg" style={{ border: "1px solid var(--color-background-light)", background: "var(--color-background-dark)"  }}>
            <p className="text-text-muted text-sm italic">
              {error === "llm" ? (
                <>
                  This service is currently offline. Contact the&nbsp;
                  <a href="https://www.linkedin.com/in/abdallah-a-mahmoud-188701311/" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline">
                    developer
                  </a>
                  &nbsp;to start the fine-tuned model server.
                </>
              ) : error === "gemini" ? (
                <>
                  Initial preprocessing unavailable, Gemini API quota reached :(
                </>
              ) : (
                <>{error}</>
              )}
            </p>
          </div>
        )}

        <div className="flex flex-row gap-3 mb-6 justify-center">
          <button
            onClick={handleAnalyzeMatch}
            disabled={loading || (!!displayedTakeaway && !typingDone)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed !py-1.5 !text-sm w-32"
          >
            {loading ? (
              <span className="flex gap-1 items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
              </span>
            ) : (
              "Analyze"
            )}
          </button>
          <button
            onClick={() => { setNavigating(true); router.push(`/user/${username}`); }}
            disabled={navigating}
            className="btn-dark disabled:opacity-50 disabled:cursor-not-allowed !py-1.5 !text-sm w-32"
            style={{ cursor: navigating ? 'wait' : 'pointer' }}
          >
            Back
          </button>
        </div>

        {matchResult && (
          <div className="relative flex items-center my-2">
            <div
              className="flex-1 h-px"
              style={{
                background: "linear-gradient(to left, var(--color-border), transparent)",
              }}
            />
            <div
              className="flex-1 h-px"
              style={{
                background: "linear-gradient(to right, var(--color-border), transparent)",
              }}
            />
          </div>
        )}

        {matchResult && verdictStyle && (
          <section className="space-y-4">
            <div className="flex justify-center sm:justify-start mt-4">
              <div
                className="inline-flex items-center px-3 py-2 rounded-2xl"
                style={{
                  background: verdictStyle.bg,
                  border: `1px solid ${verdictStyle.color}22`,
                }}
              >
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: verdictStyle.color }}
                >
                  {matchResult.verdict} Candidate
                </span>
              </div>
            </div>

            {matchResult.strengths.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--color-background-light)" }}
              >
                <button
                  type="button"
                  onClick={() => setStrengthsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
                >
                  <span className="flex items-center gap-2 font-semibold text-text-primary">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    Strengths
                  </span>
                  {strengthsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>
                {strengthsExpanded && (
                  <div className="p-5" style={{ background: "var(--color-background-dark)" }}>
                    <ul className="space-y-2.5 list-none">
                      {matchResult.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <span style={{ color: "#4ade80" }} className="mt-0.5 shrink-0 text-base leading-none">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {matchResult.gaps.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--color-background-light)" }}
              >
                <button
                  type="button"
                  onClick={() => setGapsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
                >
                  <span className="flex items-center gap-2 font-semibold text-text-primary">
                    <AlertCircle className="w-4 h-4 text-accent" />
                    Gaps
                  </span>
                  {gapsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>
                {gapsExpanded && (
                  <div className="p-5" style={{ background: "var(--color-background-dark)" }}>
                    <ul className="space-y-2.5 list-none">
                      {matchResult.gaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <span style={{ color: "#ff4d4d" }} className="mt-0.5 shrink-0 text-base leading-none">•</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <button
                type="button"
                onClick={() => setTakeawayExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-text-primary">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Takeaway
                </span>
                {takeawayExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {takeawayExpanded && (
                <div className="px-4 py-4 bg-background">
                  {takeawayLoading ? (
                    <div className="flex items-center gap-3 text-text-secondary text-sm">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  ) : displayedTakeaway ? (
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                      {displayedTakeaway}
                      {!typingDone && (
                        <span className="inline-block w-0.5 h-4 ml-0.5 bg-text-secondary align-middle animate-pulse" />
                      )}
                    </p>
                  ) : (
                    <p className="text-text-muted text-sm italic">
                      Takeaway unavailable at the moment.
                    </p>
                  )}
                </div>
              )}
            </div>
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
