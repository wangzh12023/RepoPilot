"use client";

import type {
  RepoAnalysisApiPayload,
  RepoChatRequest,
  RepoChatApiPayload,
} from "@/lib/repo-analysis-runtime";

export async function fetchRepoAnalysis(repoUrl: string) {
  const response = await fetch(
    `/api/repo/analyze?repo=${encodeURIComponent(repoUrl)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to analyze repository.");
  }

  return (await response.json()) as RepoAnalysisApiPayload;
}

export async function sendRepoChat(request: RepoChatRequest) {
  const response = await fetch("/api/repo/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to send chat request.");
  }

  return (await response.json()) as RepoChatApiPayload;
}
