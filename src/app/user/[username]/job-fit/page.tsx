"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { analyzeJobDescription, analyzeGitHubProfile } from "@/lib/api";
import type { JobAnalysisResult, ProfileAnalysisResult } from "@/lib/types";

export default function JobFitAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysisResult | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError(null);
    setJobAnalysis(null);
    setProfileAnalysis(null);

    try {
      const [jobResult, profileResult] = await Promise.all([
        analyzeJobDescription(jobDescription),
        analyzeGitHubProfile(username),
      ]);

      setJobAnalysis(jobResult);
      setProfileAnalysis(profileResult);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-surface">
      <main
        className="mt-4 p-4 sm:p-6 max-w-full sm:max-w-4xl mx-auto bg-background shadow-md rounded-3xl mb-6 px-4 sm:px-6"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary text-center sm:text-left">
            Job Fit Analysis
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

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Analyze Fit"}
          </button>
          <button
            onClick={() => router.push(`/user/${username}`)}
            className="btn-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </div>

        {(jobAnalysis || profileAnalysis) && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary">
              Analysis Results
            </h2>

            {jobAnalysis && (
              <div
                className="p-4 bg-surface rounded-lg"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Job Requirements Analysis
                </h3>
                <pre className="text-text-secondary text-sm overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(jobAnalysis, null, 2)}
                </pre>
              </div>
            )}

            {profileAnalysis && (
              <div
                className="p-4 bg-surface rounded-lg"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  GitHub Profile Analysis
                </h3>
                <pre className="text-text-secondary text-sm overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(profileAnalysis, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mt-auto bg-background border-t border-border py-4 w-full">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-muted px-4">
          © {new Date().getFullYear()} GitLens Community. All rights reserved.
        </div>
      </footer>
    </div>
  );
}