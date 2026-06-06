import "server-only";

import type { RepoAnalysis } from "@/lib/repo-analysis";
import type { RepoDataSource } from "@/lib/repo-analysis-runtime";
import type { GitHubRepoContext } from "@/lib/server/github-repo-context";

type RepoAnalysisCacheEntry = {
  analysis: RepoAnalysis;
  repoContext: GitHubRepoContext | null;
  source: RepoDataSource;
  warning?: string | null;
  createdAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

declare global {
  var __repoAnalysisCache:
    | Map<string, RepoAnalysisCacheEntry>
    | undefined;
}

const repoAnalysisCache =
  globalThis.__repoAnalysisCache ?? new Map<string, RepoAnalysisCacheEntry>();

if (!globalThis.__repoAnalysisCache) {
  globalThis.__repoAnalysisCache = repoAnalysisCache;
}

export function getRepoAnalysisCache(repoUrl: string) {
  const cacheEntry = repoAnalysisCache.get(repoUrl);

  if (!cacheEntry) {
    return null;
  }

  if (Date.now() - cacheEntry.createdAt > CACHE_TTL_MS) {
    repoAnalysisCache.delete(repoUrl);
    return null;
  }

  return cacheEntry;
}

export function setRepoAnalysisCache(
  repoUrl: string,
  cacheEntry: Omit<RepoAnalysisCacheEntry, "createdAt">,
) {
  repoAnalysisCache.set(repoUrl, {
    ...cacheEntry,
    createdAt: Date.now(),
  });
}
