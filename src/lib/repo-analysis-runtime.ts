import type { RepoAnalysis } from "@/lib/repo-analysis";

export type RepoDataSource = "mock" | "live";
export type RepoModeOverride = "mock" | "live" | "auto";

export type RepoAnalysisApiPayload = {
  analysis: RepoAnalysis;
  source: RepoDataSource;
  cached: boolean;
  warning?: string | null;
};

export type RepoChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RepoChatRequest = {
  repoUrl: string;
  analysis: RepoAnalysis;
  messages: RepoChatMessage[];
  mode?: RepoModeOverride;
};

export type RepoChatApiPayload = {
  answer: string;
  reasoning: string;
  source: RepoDataSource;
  warning?: string | null;
};

export type RepoAnalysisResponse = RepoAnalysisApiPayload;
export type RepoChatResponse = RepoChatApiPayload;
export type RepoAnalysisDataSource = RepoDataSource;
