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
  const contextFallback = buildContextFallback(repoContext);
  const normalizedIssues = normalizeIssues(
    modelOutput?.issues,
    repoContext,
    contextFallback.issues,
  );
  const normalizedModules = normalizeModules(
    modelOutput?.modules,
    repoContext,
    normalizedIssues,
    contextFallback.modules,
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
      contextFallback.stack,
      6,
    ),
    analysisSources: normalizeAnalysisSources(
      modelOutput?.analysisSources,
      repoContext,
    ),
    modules: normalizedModules,
    issues: normalizedIssues,
    workflow: normalizeStringList(modelOutput?.workflow, contextFallback.workflow, 5),
    conventions: normalizeStringList(
      modelOutput?.conventions,
      contextFallback.conventions,
      5,
    ),
    learningPath: normalizeLearningPath(
      modelOutput?.learningPath,
      repoContext,
      contextFallback.learningPath,
    ),
    suggestions: normalizeStringList(
      modelOutput?.suggestions,
      contextFallback.suggestions,
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

function buildContextFallback(repoContext: GitHubRepoContext) {
  const primaryLanguage = inferPrimaryLanguage(repoContext);
  const stack = repoContext.stackHints.length > 0
    ? repoContext.stackHints
    : [primaryLanguage, "GitHub"];
  const workflow = buildFallbackWorkflow(repoContext);
  const conventions = buildFallbackConventions(repoContext);
  const modules = buildFallbackModules(repoContext);
  const issues = buildFallbackIssues(repoContext, modules);
  const learningPath = buildFallbackLearningPath(repoContext, modules, issues);
  const suggestions = buildFallbackSuggestions(repoContext, modules);

  return {
    stack,
    workflow,
    conventions,
    modules,
    issues,
    learningPath,
    suggestions,
  };
}

function buildFallbackModules(repoContext: GitHubRepoContext): RepoModule[] {
  const candidatePaths = uniqueStrings(
    [
      ...repoContext.sourcePaths.filter(isHighSignalModulePath).slice(0, 5),
      ...repoContext.docPaths.slice(0, 1),
      ...repoContext.testPaths.slice(0, 1),
      ...repoContext.notablePaths.slice(0, 8),
    ],
    6,
  ).slice(0, 6);

  return candidatePaths.map((path, index) => ({
    id: sanitizeId(path, `module-${index + 1}`),
    title: titleFromPath(path),
    path,
    summary: summarizePathRole(path, repoContext),
    importance:
      index === 0
        ? "Core"
        : isDocumentationOrTestPath(path, repoContext)
          ? "Supporting"
          : index < 4
            ? "High"
            : "Supporting",
    language: inferLanguageFromPath(path),
    framework: inferFrameworkFromPath(path, repoContext.stackHints),
    coverage: repoContext.testPaths.length > 0 ? "Observed in repository tests" : "Review manually",
    issueRefs: [],
  }));
}

function buildFallbackIssues(
  repoContext: GitHubRepoContext,
  modules: RepoModule[],
): RepoIssue[] {
  if (repoContext.openIssues.length > 0) {
    return repoContext.openIssues.slice(0, 4).map((issue, index) => {
      const relatedModule =
        findModuleForIssue(issue.title, issue.body, modules) ??
        modules[index % Math.max(modules.length, 1)] ??
        null;
      const files = normalizePathList(
        findReferencedPaths(
          `${issue.title}\n${issue.body}`,
          repoContext.notablePaths,
          4,
        ),
        repoContext.treePaths,
        relatedModule ? [relatedModule.path] : undefined,
      );

      return {
        id: issue.id,
        title: sanitizeText(issue.title, `Task ${index + 1}`),
        summary: summarizeIssueBody(issue.body, relatedModule?.summary ?? "Repository contribution task."),
        difficulty: inferDifficultyFromIssue(issue.labels, index),
        module: relatedModule?.title ?? "Repository",
        files,
        labels: normalizeStringList(issue.labels, ["repository"], 3),
        firstStep: `Read \`${files[0] ?? relatedModule?.path ?? "README.md"}\` and reproduce the current behavior before scoping the change.`,
      };
    });
  }

  return modules.slice(0, 4).map((module, index) => ({
    id: `TASK-${index + 1}`,
    title: `Understand ${module.title}`,
    summary: `Trace how ${module.title} fits into ${repoContext.slug} and identify one safe improvement or documentation gap.`,
    difficulty: index < 2 ? "Starter" : "Intermediate",
    module: module.title,
    files: [module.path],
    labels: normalizeStringList(
      [module.importance === "Core" ? "core module" : "starter task", inferLanguageFromPath(module.path).toLowerCase()],
      ["starter task"],
      3,
    ),
    firstStep: `Open \`${module.path}\` and compare it with the README, docs, and nearby tests before proposing a change.`,
  }));
}

function buildFallbackLearningPath(
  repoContext: GitHubRepoContext,
  modules: RepoModule[],
  issues: RepoIssue[],
): LearningPathStep[] {
  const topAreas = summarizeTopLevelAreas(repoContext.sourcePaths);
  const coreModules = modules.filter((module) => module.importance !== "Supporting");
  const firstIssue = issues[0];

  return [
    {
      id: "project-overview",
      title: `Read the ${repoContext.slug} overview`,
      summary: `Start with the project framing, setup commands, and top-level areas${topAreas ? `: ${topAreas}.` : "."}`,
      deliverables: normalizeStringList(
        [
          "Confirm the install and run commands.",
          `List the main source areas${topAreas ? `: ${topAreas}` : ""}.`,
        ],
        ["Confirm the setup flow.", "List the main source areas."],
        3,
      ),
      files: normalizePathList(
        ["README.md", "package.json", repoContext.docPaths[0]].filter(Boolean) as string[],
        repoContext.treePaths,
      ),
      duration: "10 min",
    },
    {
      id: "core-flow",
      title: "Trace the core execution flow",
      summary: `Follow the most central implementation files before diving into side paths or tooling.`,
      deliverables: normalizeStringList(
        coreModules.slice(0, 2).map((module) => `Write down what ${module.title} is responsible for.`),
        ["Note the responsibilities of the core modules."],
        3,
      ),
      files: normalizePathList(
        coreModules.slice(0, 2).map((module) => module.path),
        repoContext.treePaths,
      ),
      duration: "15 min",
    },
    {
      id: "integration-points",
      title: "Map integration points",
      summary: `Connect the main modules with adjacent files, documentation, and runtime boundaries.`,
      deliverables: normalizeStringList(
        [
          "Note where data enters the codebase.",
          "List the files that coordinate shared logic or UI boundaries.",
        ],
        ["List the main integration points."],
        3,
      ),
      files: normalizePathList(
        modules.slice(2, 5).map((module) => module.path),
        repoContext.treePaths,
        modules.slice(0, 2).map((module) => module.path),
      ),
      duration: "15 min",
    },
    {
      id: "validation-surface",
      title: "Review tests and supporting docs",
      summary: `Use tests and docs to understand expected behavior, contributor workflow, and safety checks.`,
      deliverables: normalizeStringList(
        [
          repoContext.testPaths.length > 0
            ? `Inspect ${Math.min(repoContext.testPaths.length, 3)} high-signal test files.`
            : "Identify missing explicit tests and note the risk.",
          repoContext.docPaths.length > 0
            ? "Check whether docs match the implementation."
            : "Document any onboarding gaps you notice.",
        ],
        ["Review tests and docs."],
        3,
      ),
      files: normalizePathList(
        [...repoContext.testPaths.slice(0, 2), ...repoContext.docPaths.slice(0, 2)],
        repoContext.treePaths,
        ["README.md"],
      ),
      duration: "10 min",
    },
    {
      id: "first-contribution",
      title: "Pick a first contribution path",
      summary: firstIssue
        ? `Use ${firstIssue.id} as the first concrete task after you understand the architecture.`
        : `Choose one small improvement in a core module and scope it conservatively.`,
      deliverables: normalizeStringList(
        [
          firstIssue
            ? `Write down the first step for ${firstIssue.id}.`
            : "Write down a scoped first improvement.",
          "List the files you would touch first.",
        ],
        ["Write down the first contribution plan."],
        3,
      ),
      files: normalizePathList(
        firstIssue?.files ?? modules.slice(0, 2).map((module) => module.path),
        repoContext.treePaths,
      ),
      duration: "10 min",
    },
  ];
}

function buildFallbackWorkflow(repoContext: GitHubRepoContext) {
  const topAreas = summarizeTopLevelAreas(repoContext.sourcePaths);
  const firstNonReadmeDoc = repoContext.docPaths.find((path) => path.toLowerCase() !== "readme.md");
  const primaryDocs = firstNonReadmeDoc ? `README and ${firstNonReadmeDoc}` : "README and package.json";
  const stackSummary = repoContext.stackHints.length > 0 ? repoContext.stackHints.slice(0, 4).join(", ") : "the primary runtime and dependency files";

  return [
    `Read ${primaryDocs} to understand the project goal, setup flow, and maintainer expectations.`,
    `Scan the main implementation areas${topAreas ? `: ${topAreas}` : ""} before drilling into individual files.`,
    `Trace the core source files and how ${stackSummary} shape the runtime boundaries.`,
    `Use ${repoContext.testPaths.length > 0 ? "tests and docs" : "docs and repository structure"} to confirm expected behavior before editing code.`,
    `Choose a scoped issue or starter task and anchor the change to concrete files and validation steps.`,
  ];
}

function buildFallbackConventions(repoContext: GitHubRepoContext) {
  const primaryLanguage = inferPrimaryLanguage(repoContext);
  const primaryFramework =
    repoContext.stackHints.find((hint) => hint !== primaryLanguage) ??
    repoContext.stackHints[0] ??
    "the repository toolchain";
  const conventions = [
    `Keep changes grounded in concrete file paths, issue IDs, and module boundaries instead of generic summaries.`,
    `Follow the ${primaryLanguage} and ${primaryFramework} patterns already visible in the repository before introducing new structure.`,
    repoContext.testPaths.length > 0
      ? "Read nearby tests before changing behavior, then update or add validation with the code change."
      : "Validate behavioral assumptions against README, docs, and existing source flows because explicit tests are limited.",
    repoContext.docPaths.length > 0
      ? "Keep contributor-facing docs in sync when setup, architecture, or workflow changes."
      : "Document onboarding or workflow gaps you discover while reading the codebase.",
    "Prefer small, reviewable contribution slices that stay close to the module you are modifying.",
  ];

  return normalizeStringList(conventions, conventions, 5);
}

function buildFallbackSuggestions(
  repoContext: GitHubRepoContext,
  modules: RepoModule[],
) {
  const firstModule = modules[0]?.title ?? "the core module";
  const firstIssue = repoContext.openIssues[0]?.id ?? "the safest starter task";

  return [
    `Explain the architecture of ${repoContext.slug}.`,
    `Which file should I read first to understand ${firstModule}?`,
    `What is the safest first contribution in ${repoContext.slug}?`,
    `How do tests, docs, and ${firstIssue} shape this repository?`,
  ];
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

  const normalizedModules = modules.slice(0, 6).map((module, index) => {
    const resolvedPath = resolveExistingPath(
      module.path,
      repoContext.treePaths,
      fallbackModules[index]?.path,
    );

    return {
      id: sanitizeId(module.id, `module-${index + 1}`),
      title: sanitizeText(module.title, fallbackModules[index]?.title ?? titleFromPath(resolvedPath)),
      path: resolvedPath,
      summary: sanitizeText(
        module.summary,
        fallbackModules[index]?.summary ?? summarizePathRole(resolvedPath, repoContext),
      ),
      importance: normalizeImportance(module.importance),
      language: sanitizeText(module.language, inferLanguageFromPath(resolvedPath)),
      framework: sanitizeText(
        module.framework,
        inferFrameworkFromPath(resolvedPath, repoContext.stackHints),
      ),
      coverage: sanitizeText(module.coverage, "Observed"),
      issueRefs: normalizeStringList(
        (module.issueRefs ?? []).filter((issueId) =>
          issues.some((issue) => issue.id === issueId),
        ),
        fallbackIssueIds.slice(0, 2),
        3,
      ),
    } satisfies RepoModule;
  });

  return mergeUniqueByKey(
    normalizedModules,
    fallbackModules.map((module, index) => ({
      ...module,
      issueRefs: module.issueRefs.length > 0 ? module.issueRefs : fallbackIssueIds.slice(index, index + 2),
    })),
    (module) => module.path,
    6,
  );
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
      files: normalizePathList(issue.files, repoContext.treePaths),
    }));
  }

  const normalizedIssues = issues.slice(0, 4).map((issue, index) => ({
    id: sanitizeText(issue.id, `TASK-${index + 1}`),
    title: sanitizeText(issue.title, fallbackIssues[index]?.title ?? `Task ${index + 1}`),
    summary: sanitizeText(
      issue.summary,
      fallbackIssues[index]?.summary ?? "Grounded contribution task.",
    ),
    difficulty: normalizeDifficulty(issue.difficulty),
    module: sanitizeText(issue.module, fallbackIssues[index]?.module ?? "Repository"),
    files: normalizePathList(
      issue.files ?? [],
      repoContext.treePaths,
      fallbackIssues[index]?.files,
    ),
    labels: normalizeStringList(issue.labels, fallbackIssues[index]?.labels ?? [], 3),
    firstStep: sanitizeText(
      issue.firstStep,
      fallbackIssues[index]?.firstStep ?? "Read the files involved and reproduce the current behavior.",
    ),
  }));

  return mergeUniqueByKey(
    normalizedIssues,
    fallbackIssues,
    (issue) => issue.id,
    4,
  );
}

function normalizeLearningPath(
  learningPath: LearningPathStep[] | undefined,
  repoContext: GitHubRepoContext,
  fallbackLearningPath: LearningPathStep[],
) {
  if (!learningPath || learningPath.length === 0) {
    return fallbackLearningPath;
  }

  const normalizedLearningPath = learningPath.slice(0, 5).map((step, index) => ({
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
    files: normalizePathList(
      step.files ?? [],
      repoContext.treePaths,
      fallbackLearningPath[index]?.files,
    ),
    duration: sanitizeText(step.duration, fallbackLearningPath[index]?.duration ?? "10 min"),
  }));

  return mergeUniqueByKey(
    normalizedLearningPath,
    fallbackLearningPath,
    (step) => step.id,
    5,
  );
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

  return (
    treePaths.find((path) => path.toLowerCase() === "readme.md") ??
    treePaths.find((path) => path.toLowerCase() === "package.json") ??
    treePaths[0] ??
    "README.md"
  );
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

function isDocumentationOrTestPath(
  path: string,
  repoContext: GitHubRepoContext,
) {
  return repoContext.docPaths.includes(path) || repoContext.testPaths.includes(path);
}

function isHighSignalModulePath(path: string) {
  const normalizedPath = path.toLowerCase();

  return (
    normalizedPath === "package.json" ||
    normalizedPath === "readme.md" ||
    normalizedPath.startsWith("src/") ||
    normalizedPath.startsWith("app/") ||
    normalizedPath.startsWith("lib/") ||
    normalizedPath.startsWith("components/") ||
    normalizedPath.startsWith("server/") ||
    normalizedPath.startsWith("pages/")
  );
}

function titleFromPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  const rawLeaf = segments[segments.length - 1]?.replace(/\.[^.]+$/, "") ?? path;
  const parent = segments[segments.length - 2];
  const baseLabel =
    rawLeaf === "index" || rawLeaf === "page" || rawLeaf === "route" || rawLeaf === "layout"
      ? `${parent ?? "root"} ${rawLeaf}`
      : rawLeaf;

  return baseLabel
    .replace(/[\[\]()]/g, " ")
    .split(/[-_.\s/]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function summarizePathRole(
  path: string,
  repoContext: GitHubRepoContext,
) {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath === "readme.md") {
    return `Primary project overview and setup entrypoint for ${repoContext.slug}.`;
  }

  if (normalizedPath === "package.json") {
    return "Dependency manifest and script surface that defines install, build, and test commands.";
  }

  if (repoContext.docPaths.includes(path)) {
    return "Documentation surface that explains architecture, setup, or contributor workflow.";
  }

  if (repoContext.testPaths.includes(path)) {
    return "Validation file that shows expected behavior and change safety checks.";
  }

  if (normalizedPath.startsWith("app/") || normalizedPath.includes("/api/")) {
    return "Application or route boundary that wires requests, rendering, or server behavior together.";
  }

  if (normalizedPath.startsWith("components/")) {
    return "UI or presentation component that exposes part of the product surface.";
  }

  if (normalizedPath.startsWith("lib/") || normalizedPath.startsWith("src/")) {
    return "Core implementation file that holds reusable logic or domain behavior.";
  }

  return `High-signal repository file selected from ${repoContext.slug} for contributor onboarding.`;
}

function summarizeIssueBody(
  body: string,
  fallback: string,
) {
  const normalizedBody = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!normalizedBody) {
    return fallback;
  }

  return normalizedBody.length > 180
    ? `${normalizedBody.slice(0, 177)}...`
    : normalizedBody;
}

function summarizeTopLevelAreas(paths: string[]) {
  const areas = uniqueStrings(
    paths
      .filter((path) => path.includes("/"))
      .map((path) => path.split("/")[0])
      .filter((area) => area && !area.includes(".")),
    4,
  );

  return areas.join(", ");
}

function inferPrimaryLanguage(repoContext: GitHubRepoContext) {
  const stackLanguage = repoContext.stackHints.find((hint) =>
    ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Ruby"].includes(hint),
  );

  if (stackLanguage) {
    return stackLanguage;
  }

  return (
    repoContext.sourcePaths
      .map((path) => inferLanguageFromPath(path))
      .find((language) => language !== "Unknown") ??
    "Repository"
  );
}

function findReferencedPaths(
  text: string,
  candidatePaths: string[],
  maxItems: number,
) {
  const normalizedText = text.toLowerCase();
  const directMatches = candidatePaths.filter((path) =>
    normalizedText.includes(path.toLowerCase()),
  );

  if (directMatches.length > 0) {
    return directMatches.slice(0, maxItems);
  }

  const basenameMatches = candidatePaths.filter((path) => {
    const basename = path.split("/").pop()?.toLowerCase();

    return basename ? normalizedText.includes(basename) : false;
  });

  return basenameMatches.slice(0, maxItems);
}

function findModuleForIssue(
  title: string,
  body: string,
  modules: RepoModule[],
) {
  const haystack = `${title}\n${body}`.toLowerCase();

  return (
    modules.find((module) => haystack.includes(module.path.toLowerCase())) ??
    modules.find((module) => haystack.includes(module.title.toLowerCase()))
  );
}

function inferDifficultyFromIssue(
  labels: string[],
  index: number,
): DifficultyLevel {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (
    normalizedLabels.some((label) =>
      ["good first issue", "starter", "beginner", "easy"].includes(label),
    )
  ) {
    return "Starter";
  }

  if (
    normalizedLabels.some((label) =>
      ["help wanted", "intermediate", "medium"].includes(label),
    )
  ) {
    return "Intermediate";
  }

  return index === 0 ? "Starter" : index < 3 ? "Intermediate" : "Stretch";
}

function normalizePathList(
  values: string[] | undefined,
  treePaths: string[],
  fallbackValues?: string[],
) {
  const normalizedValues = mergeUniqueByKey(
    (values ?? []).map((value) =>
      resolveExistingPath(value, treePaths),
    ),
    (fallbackValues ?? []).map((value) =>
      resolveExistingPath(value, treePaths),
    ),
    (value) => value,
    4,
  );

  if (normalizedValues.length > 0) {
    return normalizedValues;
  }

  return [
    resolveExistingPath(
      "README.md",
      treePaths,
      fallbackValues?.[0],
    ),
  ];
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
  const normalizedValues = uniqueStrings(
    (values ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
    maxItems,
  );

  if (normalizedValues.length > 0) {
    return normalizedValues;
  }

  return uniqueStrings(fallbackValues, maxItems);
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
    const normalizedValue = value.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    try {
      return JSON.parse(normalizedValue) as T;
    } catch {
      const start = normalizedValue.indexOf("{");
      const end = normalizedValue.lastIndexOf("}");

      if (start >= 0 && end > start) {
        try {
          return JSON.parse(normalizedValue.slice(start, end + 1)) as T;
        } catch {
          return null;
        }
      }

      return null;
    }
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

function mergeUniqueByKey<T>(
  primaryValues: T[],
  fallbackValues: T[],
  getKey: (value: T) => string,
  maxItems: number,
) {
  const mergedValues = [...primaryValues, ...fallbackValues];
  const seenKeys = new Set<string>();
  const uniqueValues: T[] = [];

  for (const value of mergedValues) {
    const key = getKey(value);

    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueValues.push(value);

    if (uniqueValues.length >= maxItems) {
      break;
    }
  }

  return uniqueValues;
}

function uniqueStrings(values: string[], maxItems: number) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, maxItems);
}
