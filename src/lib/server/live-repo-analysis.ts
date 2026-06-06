import "server-only";

import {
  DifficultyLevel,
  type AnalysisSource,
  type GraphEdge,
  type GraphNode,
  type ImportanceLevel,
  type LearningPathStep,
  type RepoAnalysis,
  type RepoIssue,
  type RepoMetric,
  type RepoModule,
  generateAssistantResponse,
  getRepoAnalysis,
  parseGitHubRepoUrl,
} from "@/lib/repo-analysis";
import type {
  RepoAnalysisApiPayload,
  RepoChatApiPayload,
  RepoChatMessage,
  RepoModeOverride,
} from "@/lib/repo-analysis-runtime";
import { getRepoAnalysisCache, setRepoAnalysisCache } from "@/lib/server/repo-analysis-cache";
import { createDeepSeekCompletion } from "@/lib/server/deepseek";
import {
  fetchGitHubRepoContext,
  serializeRepoContextForModel,
  type GitHubRepoContext,
} from "@/lib/server/github-repo-context";
import { resolveRepoDataSource } from "@/lib/server/repo-runtime-config";

type LiveGraphDescriptor = {
  id: string;
  title: string;
  path: string;
  summary: string;
  importance: string;
  language: string;
  framework: string;
  coverage: string;
};

type LiveGraphEdgeDescriptor = {
  source: string;
  target: string;
  label?: string;
};

type LiveAnalysisModelOutput = {
  description?: string;
  commitWindow?: string;
  metrics?: RepoMetric[];
  stack?: string[];
  analysisSources?: AnalysisSource[];
  modules?: RepoModule[];
  issues?: RepoIssue[];
  workflow?: string[];
  conventions?: string[];
  learningPath?: LearningPathStep[];
  suggestions?: string[];
  architectureGraph?: {
    nodes?: LiveGraphDescriptor[];
    edges?: LiveGraphEdgeDescriptor[];
  };
  codeMapGraph?: {
    nodes?: LiveGraphDescriptor[];
    edges?: LiveGraphEdgeDescriptor[];
  };
};

export async function analyzeRepository(
  repoUrl: string,
  modeOverride?: RepoModeOverride | null,
): Promise<RepoAnalysisApiPayload> {
  const source = await resolveRepoDataSource(modeOverride);
  const fallbackAnalysis = getRepoAnalysis(repoUrl);

  if (source === "mock") {
    return {
      analysis: fallbackAnalysis,
      source: "mock",
      cached: false,
      warning: null,
    };
  }

  const cachedEntry = getRepoAnalysisCache(fallbackAnalysis.repoUrl);

  if (cachedEntry) {
    return {
      analysis: cachedEntry.analysis,
      source: cachedEntry.source,
      cached: true,
      warning: cachedEntry.warning ?? null,
    };
  }

  try {
    const repoContext = await fetchGitHubRepoContext(repoUrl);
    const liveAnalysis = await generateLiveAnalysis(repoContext);

    setRepoAnalysisCache(repoContext.repoUrl, {
      analysis: liveAnalysis,
      repoContext,
      source: "live",
      warning: null,
    });

    return {
      analysis: liveAnalysis,
      source: "live",
      cached: false,
      warning: null,
    };
  } catch (error) {
    const warning =
      error instanceof Error
        ? `Live analysis failed. Falling back to mock data: ${error.message}`
        : "Live analysis failed. Falling back to mock data.";

    setRepoAnalysisCache(fallbackAnalysis.repoUrl, {
      analysis: fallbackAnalysis,
      repoContext: null,
      source: "mock",
      warning,
    });

    return {
      analysis: fallbackAnalysis,
      source: "mock",
      cached: false,
      warning,
    };
  }
}

export async function answerRepositoryQuestion(options: {
  repoUrl: string;
  analysis: RepoAnalysis;
  messages: RepoChatMessage[];
  modeOverride?: RepoModeOverride | null;
}): Promise<RepoChatApiPayload> {
  const source = await resolveRepoDataSource(options.modeOverride);

  if (source === "mock") {
    const answer = generateAssistantResponse(
      getLatestUserMessage(options.messages),
      options.analysis,
    );

    return {
      answer,
      reasoning: `Grounding answer in mock analysis for ${options.analysis.slug}.`,
      source: "mock",
      warning: null,
    };
  }

  const cachedEntry =
    getRepoAnalysisCache(options.analysis.repoUrl) ??
    getRepoAnalysisCache(parseGitHubRepoUrl(options.repoUrl).repoUrl);

  try {
    const repoContext =
      cachedEntry?.repoContext ?? (await fetchGitHubRepoContext(options.repoUrl));
    const answer = await generateLiveChatAnswer(
      repoContext,
      options.analysis,
      options.messages,
    );

    if (!cachedEntry) {
      setRepoAnalysisCache(repoContext.repoUrl, {
        analysis: options.analysis,
        repoContext,
        source: "live",
        warning: null,
      });
    }

    return {
      answer,
      reasoning: `Grounding answer in live repository evidence for ${options.analysis.slug}: README, file tree, dependencies, tests/docs, and issues.`,
      source: "live",
      warning: null,
    };
  } catch (error) {
    const fallbackAnswer = generateAssistantResponse(
      getLatestUserMessage(options.messages),
      options.analysis,
    );
    const warning =
      error instanceof Error
        ? `Live chat failed. Falling back to mock reasoning: ${error.message}`
        : "Live chat failed. Falling back to mock reasoning.";

    return {
      answer: fallbackAnswer,
      reasoning: `Grounding answer in mock fallback for ${options.analysis.slug}.`,
      source: "mock",
      warning,
    };
  }
}

async function generateLiveAnalysis(repoContext: GitHubRepoContext) {
  const prompt = buildAnalysisPrompt(repoContext);
  const completion = await createDeepSeekCompletion(
    [
      {
        role: "system",
        content:
          "You analyze GitHub repositories and must respond with valid json only. Every file path and issue reference in the json must be grounded in the provided repository context.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      jsonMode: true,
      maxTokens: 2600,
    },
  );
  const parsedResponse = safeJsonParse<LiveAnalysisModelOutput>(completion.content);

  return buildRepoAnalysis(repoContext, parsedResponse);
}

async function generateLiveChatAnswer(
  repoContext: GitHubRepoContext,
  analysis: RepoAnalysis,
  messages: RepoChatMessage[],
) {
  const contextBlock = [
    `Repository slug: ${analysis.slug}`,
    `Analysis summary json:\n${JSON.stringify(
      {
        description: analysis.description,
        modules: analysis.modules,
        issues: analysis.issues,
        workflow: analysis.workflow,
        learningPath: analysis.learningPath,
      },
      null,
      2,
    )}`,
    `Repository evidence:\n${serializeRepoContextForModel(repoContext)}`,
  ].join("\n\n");

  const completion = await createDeepSeekCompletion(
    [
      {
        role: "system",
        content:
          "You are a repository learning assistant. Answer in markdown. Reference concrete file paths in backticks and issue IDs when relevant. If the evidence is weak, say so instead of guessing.",
      },
      {
        role: "user",
        content: contextBlock,
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    {
      maxTokens: 900,
    },
  );

  return completion.content;
}

function buildAnalysisPrompt(repoContext: GitHubRepoContext) {
  return `
Analyze this GitHub repository and return json only.

Repository context:
${serializeRepoContextForModel(repoContext)}

Return a json object with exactly these top-level keys:
{
  "description": "string",
  "commitWindow": "string",
  "metrics": [
    { "label": "string", "value": "string", "detail": "string" }
  ],
  "stack": ["string"],
  "analysisSources": [
    { "label": "string", "detail": "string" }
  ],
  "modules": [
    {
      "id": "kebab-case string",
      "title": "string",
      "path": "existing file path from repository",
      "summary": "string",
      "importance": "Core | High | Supporting",
      "language": "string",
      "framework": "string",
      "coverage": "short string",
      "issueRefs": ["#123 or TASK-1"]
    }
  ],
  "issues": [
    {
      "id": "#123 or TASK-1",
      "title": "string",
      "summary": "string",
      "difficulty": "Starter | Intermediate | Stretch",
      "module": "title of one listed module",
      "files": ["existing file path"],
      "labels": ["string"],
      "firstStep": "string"
    }
  ],
  "workflow": ["string"],
  "conventions": ["string"],
  "learningPath": [
    {
      "id": "kebab-case string",
      "title": "string",
      "summary": "string",
      "deliverables": ["string"],
      "files": ["existing file path"],
      "duration": "short string like 10 min"
    }
  ],
  "suggestions": ["string"],
  "architectureGraph": {
    "nodes": [
      {
        "id": "kebab-case string",
        "title": "string",
        "path": "existing file path",
        "summary": "string",
        "importance": "Core | High | Supporting",
        "language": "string",
        "framework": "string",
        "coverage": "short string"
      }
    ],
    "edges": [
      { "source": "node id", "target": "node id", "label": "string" }
    ]
  },
  "codeMapGraph": {
    "nodes": [
      {
        "id": "kebab-case string",
        "title": "string",
        "path": "existing file path",
        "summary": "string",
        "importance": "Core | High | Supporting",
        "language": "string",
        "framework": "string",
        "coverage": "short string"
      }
    ],
    "edges": [
      { "source": "node id", "target": "node id", "label": "string" }
    ]
  }
}

Requirements:
- output valid json only
- keep metrics to exactly 4 items
- keep stack to 4-6 items
- keep modules to 4-6 items
- keep issues to 3-4 items. If the repository has too few useful open issues, synthesize grounded starter tasks using ids like TASK-1.
- keep workflow to 5 items
- keep conventions to 4-5 items
- keep learningPath to 4-5 items
- keep suggestions to 4 items
- every path must exist in the provided repository tree
- use concise summaries grounded in README, package manifest, tests, docs, and issues
- coverage values are confidence signals, not exact measured coverage
`.trim();
}

function buildRepoAnalysis(
  repoContext: GitHubRepoContext,
  modelOutput: LiveAnalysisModelOutput | null,
): RepoAnalysis {
  const fallbackAnalysis = getRepoAnalysis(repoContext.repoUrl);
  const normalizedIssues = normalizeIssues(
    modelOutput?.issues,
    repoContext,
    fallbackAnalysis.issues,
  );
  const normalizedModules = normalizeModules(
    modelOutput?.modules,
    repoContext,
    normalizedIssues,
    fallbackAnalysis.modules,
  );

  const architectureDescriptors = normalizeGraphDescriptors(
    modelOutput?.architectureGraph?.nodes,
    normalizedModules,
    repoContext,
  );
  const codeMapDescriptors = normalizeGraphDescriptors(
    modelOutput?.codeMapGraph?.nodes,
    normalizedModules,
    repoContext,
  );

  return {
    repoUrl: repoContext.repoUrl,
    owner: repoContext.owner,
    name: repoContext.name,
    slug: repoContext.slug,
    description: sanitizeText(
      modelOutput?.description,
      repoContext.description,
    ),
    branch: repoContext.defaultBranch,
    commitWindow: sanitizeText(
      modelOutput?.commitWindow,
      formatCommitWindow(repoContext),
    ),
    metrics: normalizeMetrics(
      modelOutput?.metrics,
      repoContext,
      normalizedModules,
      normalizedIssues,
    ),
    stack: normalizeStringList(
      modelOutput?.stack,
      repoContext.stackHints.length > 0 ? repoContext.stackHints : fallbackAnalysis.stack,
      6,
    ),
    analysisSources: normalizeAnalysisSources(
      modelOutput?.analysisSources,
      repoContext,
    ),
    modules: normalizedModules,
    issues: normalizedIssues,
    workflow: normalizeStringList(modelOutput?.workflow, fallbackAnalysis.workflow, 5),
    conventions: normalizeStringList(
      modelOutput?.conventions,
      fallbackAnalysis.conventions,
      5,
    ),
    learningPath: normalizeLearningPath(
      modelOutput?.learningPath,
      repoContext,
      fallbackAnalysis.learningPath,
    ),
    suggestions: normalizeStringList(
      modelOutput?.suggestions,
      [
        `Explain the architecture of ${repoContext.slug}.`,
        "Which module should I read first?",
        "What is the safest first contribution here?",
        "How do tests and docs shape this codebase?",
      ],
      4,
    ),
    architectureGraph: {
      nodes: layoutGraphNodes(architectureDescriptors),
      edges: normalizeGraphEdges(
        modelOutput?.architectureGraph?.edges,
        architectureDescriptors.map((descriptor) => descriptor.id),
      ),
    },
    codeMapGraph: {
      nodes: layoutGraphNodes(codeMapDescriptors),
      edges: normalizeGraphEdges(
        modelOutput?.codeMapGraph?.edges,
        codeMapDescriptors.map((descriptor) => descriptor.id),
      ),
    },
  };
}

function normalizeModules(
  modules: RepoModule[] | undefined,
  repoContext: GitHubRepoContext,
  issues: RepoIssue[],
  fallbackModules: RepoModule[],
) {
  const fallbackIssueIds = issues.map((issue) => issue.id);

  if (!modules || modules.length === 0) {
    return fallbackModules.map((module) => ({
      ...module,
      path: resolveExistingPath(module.path, repoContext.treePaths),
      issueRefs: fallbackIssueIds.slice(0, 2),
    }));
  }

  return modules.slice(0, 6).map((module, index) => ({
    id: sanitizeId(module.id, `module-${index + 1}`),
    title: sanitizeText(module.title, fallbackModules[index]?.title ?? `Module ${index + 1}`),
    path: resolveExistingPath(
      module.path,
      repoContext.treePaths,
      fallbackModules[index]?.path,
    ),
    summary: sanitizeText(
      module.summary,
      fallbackModules[index]?.summary ?? "Important repository module.",
    ),
    importance: normalizeImportance(module.importance),
    language: sanitizeText(module.language, inferLanguageFromPath(module.path)),
    framework: sanitizeText(
      module.framework,
      inferFrameworkFromPath(module.path, repoContext.stackHints),
    ),
    coverage: sanitizeText(module.coverage, "Observed"),
    issueRefs: (module.issueRefs ?? [])
      .filter((issueId) => issues.some((issue) => issue.id === issueId))
      .slice(0, 3),
  }));
}

function normalizeIssues(
  issues: RepoIssue[] | undefined,
  repoContext: GitHubRepoContext,
  fallbackIssues: RepoIssue[],
) {
  if (!issues || issues.length === 0) {
    return fallbackIssues.map((issue, index) => ({
      ...issue,
      id: `TASK-${index + 1}`,
      files: issue.files.map((file) =>
        resolveExistingPath(file, repoContext.treePaths),
      ),
    }));
  }

  return issues.slice(0, 4).map((issue, index) => ({
    id: sanitizeText(issue.id, `TASK-${index + 1}`),
    title: sanitizeText(issue.title, fallbackIssues[index]?.title ?? `Task ${index + 1}`),
    summary: sanitizeText(
      issue.summary,
      fallbackIssues[index]?.summary ?? "Grounded contribution task.",
    ),
    difficulty: normalizeDifficulty(issue.difficulty),
    module: sanitizeText(issue.module, fallbackIssues[index]?.module ?? "Repository"),
    files: (issue.files ?? [])
      .slice(0, 4)
      .map((filePath) =>
        resolveExistingPath(
          filePath,
          repoContext.treePaths,
          fallbackIssues[index]?.files[0],
        ),
      ),
    labels: normalizeStringList(issue.labels, fallbackIssues[index]?.labels ?? [], 3),
    firstStep: sanitizeText(
      issue.firstStep,
      fallbackIssues[index]?.firstStep ?? "Read the files involved and reproduce the current behavior.",
    ),
  }));
}

function normalizeLearningPath(
  learningPath: LearningPathStep[] | undefined,
  repoContext: GitHubRepoContext,
  fallbackLearningPath: LearningPathStep[],
) {
  if (!learningPath || learningPath.length === 0) {
    return fallbackLearningPath;
  }

  return learningPath.slice(0, 5).map((step, index) => ({
    id: sanitizeId(step.id, `step-${index + 1}`),
    title: sanitizeText(step.title, fallbackLearningPath[index]?.title ?? `Step ${index + 1}`),
    summary: sanitizeText(
      step.summary,
      fallbackLearningPath[index]?.summary ?? "Read this part of the codebase.",
    ),
    deliverables: normalizeStringList(
      step.deliverables,
      fallbackLearningPath[index]?.deliverables ?? ["Notes", "Questions"],
      3,
    ),
    files: (step.files ?? [])
      .slice(0, 4)
      .map((filePath) =>
        resolveExistingPath(
          filePath,
          repoContext.treePaths,
          fallbackLearningPath[index]?.files[0],
        ),
      ),
    duration: sanitizeText(step.duration, fallbackLearningPath[index]?.duration ?? "10 min"),
  }));
}

function normalizeMetrics(
  metrics: RepoMetric[] | undefined,
  repoContext: GitHubRepoContext,
  modules: RepoModule[],
  issues: RepoIssue[],
) {
  const computedMetrics: RepoMetric[] = [
    {
      label: "Key Modules",
      value: String(modules.length),
      detail: `${repoContext.notablePaths.length} notable files scanned across source, docs, and tests`,
    },
    {
      label: "Open Issues",
      value: String(issues.length),
      detail: `${repoContext.openIssues.length} live issue threads reviewed for contribution hints`,
    },
    {
      label: "Test Coverage",
      value: `${Math.max(1, repoContext.testPaths.length)} files`,
      detail: `${repoContext.testPaths.length} explicit test files and related safety signals were found`,
    },
    {
      label: "Docs Surface",
      value: String(Math.max(1, repoContext.docPaths.length)),
      detail: `${repoContext.docPaths.length} README/docs files contribute onboarding context`,
    },
  ];

  if (!metrics || metrics.length === 0) {
    return computedMetrics;
  }

  return metrics.slice(0, 4).map((metric, index) => ({
    label: sanitizeText(metric.label, computedMetrics[index]?.label ?? "Metric"),
    value: sanitizeText(metric.value, computedMetrics[index]?.value ?? "n/a"),
    detail: sanitizeText(metric.detail, computedMetrics[index]?.detail ?? ""),
  }));
}

function normalizeAnalysisSources(
  analysisSources: AnalysisSource[] | undefined,
  repoContext: GitHubRepoContext,
) {
  const fallbackSources: AnalysisSource[] = [
    {
      label: "README",
      detail: "entrypoint for product intent and setup flow",
    },
    {
      label: "Directory Tree",
      detail: `${repoContext.notablePaths.length} notable files across the repository structure`,
    },
    {
      label: "Dependencies",
      detail: repoContext.stackHints.join(", ") || "stack hints from the package manifest",
    },
    {
      label: "Tests",
      detail: `${repoContext.testPaths.length} test files contributed validation signals`,
    },
    {
      label: "Docs",
      detail: `${repoContext.docPaths.length} docs files shaped conventions and onboarding`,
    },
    {
      label: "Issues",
      detail: `${repoContext.openIssues.length} open issues were used for contribution suggestions`,
    },
  ];

  if (!analysisSources || analysisSources.length === 0) {
    return fallbackSources;
  }

  return analysisSources.slice(0, 6).map((source, index) => ({
    label: sanitizeText(source.label, fallbackSources[index]?.label ?? "Source"),
    detail: sanitizeText(source.detail, fallbackSources[index]?.detail ?? ""),
  }));
}

function normalizeGraphDescriptors(
  graphNodes: LiveGraphDescriptor[] | undefined,
  modules: RepoModule[],
  repoContext: GitHubRepoContext,
) {
  const fallbackGraphNodes = modules.slice(0, 6).map((module) => ({
    id: module.id,
    title: module.title,
    path: module.path,
    summary: module.summary,
    importance: module.importance,
    language: module.language,
    framework: module.framework,
    coverage: module.coverage,
  }));

  const descriptors = (graphNodes && graphNodes.length > 0
    ? graphNodes.slice(0, 6)
    : fallbackGraphNodes
  ).map((node, index) => ({
    id: sanitizeId(node.id, `node-${index + 1}`),
    title: sanitizeText(node.title, fallbackGraphNodes[index]?.title ?? `Node ${index + 1}`),
    path: resolveExistingPath(
      node.path,
      repoContext.treePaths,
      fallbackGraphNodes[index]?.path,
    ),
    summary: sanitizeText(
      node.summary,
      fallbackGraphNodes[index]?.summary ?? "Important repository file.",
    ),
    importance: normalizeImportance(node.importance),
    language: sanitizeText(node.language, inferLanguageFromPath(node.path)),
    framework: sanitizeText(
      node.framework,
      inferFrameworkFromPath(node.path, repoContext.stackHints),
    ),
    coverage: sanitizeText(node.coverage, "Observed"),
  }));

  return dedupeById(descriptors);
}

function normalizeGraphEdges(
  edges: LiveGraphEdgeDescriptor[] | undefined,
  nodeIds: string[],
): GraphEdge[] {
  const allowedNodeIds = new Set(nodeIds);
  const normalizedEdges = (edges ?? [])
    .filter(
      (edge) =>
        allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target),
    )
    .map((edge, index) => ({
      id: `edge-${index + 1}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label ? sanitizeText(edge.label, edge.label) : undefined,
    }));

  if (normalizedEdges.length > 0) {
    return normalizedEdges;
  }

  return nodeIds.slice(1).map((nodeId, index) => ({
    id: `edge-fallback-${index + 1}`,
    source: nodeIds[index]!,
    target: nodeId,
    label: index === 0 ? "flow" : "next",
  }));
}

function layoutGraphNodes(nodes: LiveGraphDescriptor[]) {
  const columns = Math.min(nodes.length, 3);

  return nodes.map((node, index): GraphNode => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      id: node.id,
      position: {
        x: column * 320,
        y: row * 220,
      },
      data: {
        title: node.title,
        path: node.path,
        summary: node.summary,
        importance: normalizeImportance(node.importance),
        language: node.language,
        framework: node.framework,
        coverage: node.coverage,
      },
    };
  });
}

function getLatestUserMessage(messages: RepoChatMessage[]) {
  return (
    [...messages].reverse().find((message) => message.role === "user")?.content ??
    ""
  );
}

function resolveExistingPath(
  candidate: string | undefined,
  treePaths: string[],
  fallbackCandidate?: string,
) {
  const normalizedCandidate = candidate?.trim();

  if (normalizedCandidate && treePaths.includes(normalizedCandidate)) {
    return normalizedCandidate;
  }

  if (normalizedCandidate) {
    const basename = normalizedCandidate.split("/").pop();

    if (basename) {
      const matchingPath = treePaths.find((path) => path.endsWith(`/${basename}`) || path === basename);

      if (matchingPath) {
        return matchingPath;
      }
    }
  }

  if (fallbackCandidate) {
    return resolveExistingPath(fallbackCandidate, treePaths);
  }

  return treePaths[0] ?? "README.md";
}

function inferLanguageFromPath(path: string | undefined) {
  const normalizedPath = path?.toLowerCase() ?? "";

  if (normalizedPath.endsWith(".tsx") || normalizedPath.endsWith(".ts")) {
    return "TypeScript";
  }

  if (normalizedPath.endsWith(".jsx") || normalizedPath.endsWith(".js")) {
    return "JavaScript";
  }

  if (normalizedPath.endsWith(".py")) {
    return "Python";
  }

  if (normalizedPath.endsWith(".md")) {
    return "Markdown";
  }

  return "Unknown";
}

function inferFrameworkFromPath(
  path: string | undefined,
  stackHints: string[],
) {
  const normalizedPath = path?.toLowerCase() ?? "";

  if (normalizedPath.startsWith("app/")) {
    return "Next.js";
  }

  if (normalizedPath.includes("component")) {
    return "React";
  }

  if (normalizedPath.includes("test")) {
    return stackHints.find((value) => value === "playwright" || value === "jest" || value === "vitest") ?? "Tests";
  }

  return stackHints[0] ?? "Repository";
}

function normalizeImportance(value: string | undefined): ImportanceLevel {
  if (value === "Core" || value === "High" || value === "Supporting") {
    return value;
  }

  return "Supporting";
}

function normalizeDifficulty(value: string | undefined): DifficultyLevel {
  if (value === "Starter" || value === "Intermediate" || value === "Stretch") {
    return value;
  }

  return "Starter";
}

function sanitizeId(value: string | undefined, fallbackValue: string) {
  const normalizedValue = value
    ?.toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return normalizedValue || fallbackValue;
}

function sanitizeText(value: string | undefined, fallbackValue: string) {
  const normalizedValue = value?.trim();

  return normalizedValue || fallbackValue;
}

function normalizeStringList(
  values: string[] | undefined,
  fallbackValues: string[],
  maxItems: number,
) {
  const normalizedValues = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);

  if (normalizedValues.length > 0) {
    return normalizedValues;
  }

  return fallbackValues.slice(0, maxItems);
}

function formatCommitWindow(repoContext: GitHubRepoContext) {
  if (!repoContext.latestCommitDate) {
    return "recent repository activity";
  }

  const latestCommitDate = new Date(repoContext.latestCommitDate);
  const now = new Date();
  const elapsedDays = Math.max(
    1,
    Math.round((now.getTime() - latestCommitDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return `latest commit ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function dedupeById<T extends { id: string }>(values: T[]) {
  const seenIds = new Set<string>();

  return values.filter((value) => {
    if (seenIds.has(value.id)) {
      return false;
    }

    seenIds.add(value.id);
    return true;
  });
}
