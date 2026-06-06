import "server-only";

import { parseGitHubRepoUrl } from "@/lib/repo-analysis";
import { getRepoRuntimeConfig } from "@/lib/server/repo-runtime-config";

type GitHubRepoApiResponse = {
  description: string | null;
  default_branch: string;
  pushed_at: string;
  stargazers_count: number;
  open_issues_count: number;
};

type GitHubTreeApiResponse = {
  tree?: Array<{
    path: string;
    type: "blob" | "tree";
  }>;
  truncated?: boolean;
};

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
};

type GitHubIssueApiResponse = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  pull_request?: object;
  labels: Array<{ name: string }>;
};

type GitHubCommitApiResponse = {
  commit?: {
    author?: {
      date?: string;
    };
  };
};

export type GitHubIssueContext = {
  id: string;
  title: string;
  body: string;
  labels: string[];
  url: string;
};

export type GitHubRepoContext = {
  repoUrl: string;
  owner: string;
  name: string;
  slug: string;
  description: string;
  defaultBranch: string;
  pushedAt: string | null;
  latestCommitDate: string | null;
  treePaths: string[];
  notablePaths: string[];
  docPaths: string[];
  testPaths: string[];
  sourcePaths: string[];
  stackHints: string[];
  readme: string;
  packageJson: string;
  openIssues: GitHubIssueContext[];
};

export async function fetchGitHubRepoContext(repoUrl: string) {
  const identity = parseGitHubRepoUrl(repoUrl);
  const config = await getRepoRuntimeConfig();

  const repo = await githubRequest<GitHubRepoApiResponse>(
    `/repos/${identity.owner}/${identity.name}`,
    config.githubToken,
  );

  const [
    treeResponse,
    readme,
    packageJson,
    languages,
    issues,
    commits,
  ] = await Promise.all([
    githubRequest<GitHubTreeApiResponse>(
      `/repos/${identity.owner}/${identity.name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
      config.githubToken,
    ),
    fetchGitHubFile(identity.owner, identity.name, "README.md", repo.default_branch, config.githubToken),
    fetchGitHubFile(identity.owner, identity.name, "package.json", repo.default_branch, config.githubToken),
    githubRequest<Record<string, number>>(
      `/repos/${identity.owner}/${identity.name}/languages`,
      config.githubToken,
    ).catch(() => ({})),
    githubRequest<GitHubIssueApiResponse[]>(
      `/repos/${identity.owner}/${identity.name}/issues?state=open&per_page=8`,
      config.githubToken,
    ).catch(() => []),
    githubRequest<GitHubCommitApiResponse[]>(
      `/repos/${identity.owner}/${identity.name}/commits?per_page=8`,
      config.githubToken,
    ).catch(() => []),
  ]);

  const treePaths = (treeResponse.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path);
  const docPaths = treePaths.filter(isDocumentationPath);
  const testPaths = treePaths.filter(isTestPath);
  const sourcePaths = treePaths.filter((path) => !isDocumentationPath(path));
  const notablePaths = selectNotablePaths(treePaths);
  const stackHints = buildStackHints(languages, packageJson);

  return {
    repoUrl: identity.repoUrl,
    owner: identity.owner,
    name: identity.name,
    slug: `${identity.owner}/${identity.name}`,
    description: repo.description ?? `GitHub repository ${identity.owner}/${identity.name}.`,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at ?? null,
    latestCommitDate: commits[0]?.commit?.author?.date ?? null,
    treePaths,
    notablePaths,
    docPaths,
    testPaths,
    sourcePaths,
    stackHints,
    readme,
    packageJson,
    openIssues: issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: `#${issue.number}`,
        title: issue.title,
        body: truncateText(issue.body ?? "", 800),
        labels: issue.labels.map((label) => label.name),
        url: issue.html_url,
      })),
  } satisfies GitHubRepoContext;
}

export function serializeRepoContextForModel(repoContext: GitHubRepoContext) {
  return [
    `Repository: ${repoContext.slug}`,
    `Description: ${repoContext.description}`,
    `Default branch: ${repoContext.defaultBranch}`,
    `Latest commit date: ${repoContext.latestCommitDate ?? "unknown"}`,
    `README excerpt:\n${truncateText(repoContext.readme || "No README available.", 3500)}`,
    `Package manifest:\n${truncateText(repoContext.packageJson || "No package.json available.", 2500)}`,
    `Stack hints: ${repoContext.stackHints.join(", ") || "None detected"}`,
    `Documentation files:\n${repoContext.docPaths.slice(0, 24).join("\n") || "No docs files detected"}`,
    `Test files:\n${repoContext.testPaths.slice(0, 24).join("\n") || "No tests detected"}`,
    `Notable repository paths:\n${repoContext.notablePaths.join("\n")}`,
    `Open issues:\n${repoContext.openIssues
      .map(
        (issue) =>
          `${issue.id} ${issue.title}\nlabels: ${issue.labels.join(", ") || "none"}\n${issue.body || "No body."}`,
      )
      .join("\n\n") || "No open issues found"}`,
  ].join("\n\n");
}

function selectNotablePaths(treePaths: string[]) {
  return [...treePaths]
    .sort((leftPath, rightPath) => scorePath(rightPath) - scorePath(leftPath))
    .slice(0, 90)
    .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
}

function buildStackHints(
  languages: Record<string, number>,
  packageJsonText: string,
) {
  const parsedPackageJson = tryParsePackageJson(packageJsonText);
  const dependencyNames = [
    ...Object.keys(parsedPackageJson?.dependencies ?? {}),
    ...Object.keys(parsedPackageJson?.devDependencies ?? {}),
  ];

  return Array.from(
    new Set([
      ...Object.keys(languages),
      ...dependencyNames.filter((dependency) =>
        [
          "next",
          "react",
          "typescript",
          "tailwindcss",
          "express",
          "vite",
          "jest",
          "vitest",
          "playwright",
          "eslint",
          "prettier",
          "zod",
        ].includes(dependency),
      ),
    ]),
  ).slice(0, 8);
}

function tryParsePackageJson(packageJsonText: string) {
  if (!packageJsonText.trim()) {
    return null;
  }

  try {
    return JSON.parse(packageJsonText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function scorePath(path: string) {
  const normalizedPath = path.toLowerCase();
  const depth = path.split("/").length;
  let score = 0;

  if (normalizedPath === "readme.md") score += 200;
  if (normalizedPath === "package.json") score += 190;
  if (normalizedPath.startsWith("src/")) score += 130;
  if (normalizedPath.startsWith("app/")) score += 125;
  if (normalizedPath.startsWith("lib/")) score += 120;
  if (normalizedPath.startsWith("components/")) score += 118;
  if (normalizedPath.startsWith("docs/")) score += 110;
  if (normalizedPath.includes("test")) score += 105;
  if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) score += 40;
  if (normalizedPath.endsWith(".js") || normalizedPath.endsWith(".jsx")) score += 32;
  if (normalizedPath.endsWith(".md")) score += 24;

  return score - depth * 2;
}

function isDocumentationPath(path: string) {
  const normalizedPath = path.toLowerCase();

  return (
    normalizedPath === "readme.md" ||
    normalizedPath.startsWith("docs/") ||
    normalizedPath.includes("contributing") ||
    normalizedPath.endsWith(".md")
  );
}

function isTestPath(path: string) {
  const normalizedPath = path.toLowerCase();

  return (
    normalizedPath.startsWith("test/") ||
    normalizedPath.startsWith("tests/") ||
    normalizedPath.includes("__tests__") ||
    normalizedPath.endsWith(".spec.ts") ||
    normalizedPath.endsWith(".test.ts") ||
    normalizedPath.endsWith(".spec.tsx") ||
    normalizedPath.endsWith(".test.tsx") ||
    normalizedPath.endsWith(".spec.js") ||
    normalizedPath.endsWith(".test.js")
  );
}

async function fetchGitHubFile(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
  token: string | null,
) {
  try {
    const response = await githubRequest<GitHubContentResponse>(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(ref)}`,
      token,
    );

    if (!response.content) {
      return "";
    }

    if (response.encoding === "base64") {
      return Buffer.from(response.content, "base64").toString("utf8");
    }

    return response.content;
  } catch {
    return "";
  }
}

async function githubRequest<T>(path: string, token: string | null) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "repo-learning-assistant",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");

    if (response.status === 403 && !token) {
      throw new Error(
        remaining === "0"
          ? "GitHub anonymous API rate limit reached. Add GITHUB_TOKEN to enable live repository analysis."
          : "GitHub rejected the anonymous repository request. Add GITHUB_TOKEN to enable live repository analysis.",
      );
    }

    throw new Error(`GitHub request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}
