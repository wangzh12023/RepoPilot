import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { RepoModeOverride } from "@/lib/repo-analysis-runtime";

type RepoRuntimeMode = RepoModeOverride;

export type RepoRuntimeConfig = {
  mode: RepoRuntimeMode;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  githubToken: string | null;
};

const VALID_MODES = new Set<RepoRuntimeMode>(["auto", "mock", "live"]);
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

let cachedFallbackApiKey: string | null | undefined;

export async function getRepoRuntimeConfig(): Promise<RepoRuntimeConfig> {
  const apiKey = (await getDeepSeekApiKey()) ?? null;
  const rawMode =
    process.env.REPO_ANALYSIS_MODE ??
    process.env.REPO_DATA_MODE ??
    process.env.REPO_ANALYSIS_SOURCE ??
    "auto";
  const mode = VALID_MODES.has(rawMode as RepoRuntimeMode)
    ? (rawMode as RepoRuntimeMode)
    : "auto";

  return {
    mode,
    baseUrl:
      process.env.DEEPSEEK_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim() ||
      DEFAULT_BASE_URL,
    model:
      process.env.DEEPSEEK_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      DEFAULT_MODEL,
    apiKey,
    githubToken: process.env.GITHUB_TOKEN?.trim() || null,
  };
}

export async function resolveRepoDataSource(
  override?: RepoModeOverride | null,
): Promise<"mock" | "live"> {
  if (override === "mock" || override === "live") {
    return override;
  }

  const config = await getRepoRuntimeConfig();

  if (config.mode === "mock") {
    return "mock";
  }

  if (config.mode === "live") {
    return "live";
  }

  return config.apiKey ? "live" : "mock";
}

async function getDeepSeekApiKey() {
  const envKey =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.api_key?.trim();

  if (envKey) {
    return envKey;
  }

  if (cachedFallbackApiKey !== undefined) {
    return cachedFallbackApiKey;
  }

  cachedFallbackApiKey = await readFallbackApiKeyFromEnvFiles();

  return cachedFallbackApiKey;
}

async function readFallbackApiKeyFromEnvFiles() {
  const envPaths = [".env.local", ".env"];

  for (const relativePath of envPaths) {
    const absolutePath = path.join(process.cwd(), relativePath);

    try {
      const fileContents = await fs.readFile(absolutePath, "utf8");
      const parsedKey = parseEnvFileForApiKey(fileContents);

      if (parsedKey) {
        return parsedKey;
      }
    } catch {
      // Ignore missing env files.
    }
  }

  return null;
}

function parseEnvFileForApiKey(fileContents: string) {
  const trimmedContents = fileContents.trim();

  if (/^sk-[A-Za-z0-9._-]+$/.test(trimmedContents)) {
    return trimmedContents;
  }

  for (const line of fileContents.split(/\r?\n/)) {
    const normalizedLine = line.trim();

    if (!normalizedLine || normalizedLine.startsWith("#")) {
      continue;
    }

    const match = normalizedLine.match(
      /^([A-Za-z0-9_]+)\s*=\s*("?)(.+?)\2$/,
    );

    if (!match) {
      continue;
    }

    const [, key, , value] = match;

    if (
      key === "DEEPSEEK_API_KEY" ||
      key === "OPENAI_API_KEY" ||
      key === "api_key"
    ) {
      return value.trim();
    }
  }

  return null;
}
