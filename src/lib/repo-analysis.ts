export const SAMPLE_REPO_URL = "https://github.com/vercel/ai-chatbot";

export type ImportanceLevel = "Core" | "High" | "Supporting";
export type DifficultyLevel = "Starter" | "Intermediate" | "Stretch";

export type RepoMetric = {
  label: string;
  value: string;
  detail: string;
};

export type RepoModule = {
  id: string;
  title: string;
  path: string;
  summary: string;
  importance: ImportanceLevel;
  language: string;
  framework: string;
  coverage: string;
  issueRefs: string[];
};

export type RepoIssue = {
  id: string;
  title: string;
  summary: string;
  difficulty: DifficultyLevel;
  module: string;
  files: string[];
  labels: string[];
  firstStep: string;
};

export type LearningPathStep = {
  id: string;
  title: string;
  summary: string;
  deliverables: string[];
  files: string[];
  duration: string;
};

export type AnalysisSource = {
  label: string;
  detail: string;
};

export type GraphNodeData = {
  title: string;
  path: string;
  summary: string;
  importance: ImportanceLevel;
  language: string;
  framework: string;
  coverage: string;
};

export type GraphNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: GraphNodeData;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type RepoAnalysis = {
  repoUrl: string;
  owner: string;
  name: string;
  slug: string;
  description: string;
  branch: string;
  commitWindow: string;
  metrics: RepoMetric[];
  stack: string[];
  analysisSources: AnalysisSource[];
  modules: RepoModule[];
  issues: RepoIssue[];
  workflow: string[];
  conventions: string[];
  learningPath: LearningPathStep[];
  suggestions: string[];
  architectureGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  codeMapGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
};

type RepoIdentity = {
  owner: string;
  name: string;
  repoUrl: string;
};

const FALLBACK_REPO: RepoIdentity = {
  owner: "vercel",
  name: "ai-chatbot",
  repoUrl: SAMPLE_REPO_URL,
};

const isValidGitHubRepoUrl = (value: string) =>
  /^https?:\/\/github\.com\/[^/\s]+\/[^/\s?#]+\/?$/.test(value.trim());

export function parseGitHubRepoUrl(value?: string | null): RepoIdentity {
  if (!value || !isValidGitHubRepoUrl(value)) {
    return FALLBACK_REPO;
  }

  try {
    const url = new URL(value.trim());
    const [, owner, repo] = url.pathname.split("/");

    if (!owner || !repo) {
      return FALLBACK_REPO;
    }

    return {
      owner,
      name: repo.replace(/\.git$/, ""),
      repoUrl: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`,
    };
  } catch {
    return FALLBACK_REPO;
  }
}

const formatRepoSlug = (owner: string, name: string) => `${owner}/${name}`;

export function getRepoAnalysis(repoUrl?: string | null): RepoAnalysis {
  const identity = parseGitHubRepoUrl(repoUrl);
  const slug = formatRepoSlug(identity.owner, identity.name);

  const modules: RepoModule[] = [
    {
      id: "intake",
      title: "Repository Intake",
      path: "app/api/repo/analyze/route.ts",
      summary:
        "Normalizes the GitHub URL, fans out README/tree/dependency fetchers, and builds the first analysis snapshot.",
      importance: "Core",
      language: "TypeScript",
      framework: "Next.js Route Handler",
      coverage: "82%",
      issueRefs: ["#128", "#176"],
    },
    {
      id: "github-context",
      title: "GitHub Context Loader",
      path: "lib/github/fetch-repo-context.ts",
      summary:
        "Collects README sections, directory structure, docs, tests, and open issues into a single grounded context payload.",
      importance: "Core",
      language: "TypeScript",
      framework: "Octokit",
      coverage: "91%",
      issueRefs: ["#176", "#204"],
    },
    {
      id: "knowledge-index",
      title: "Knowledge Index",
      path: "lib/indexing/build-repo-index.ts",
      summary:
        "Creates module summaries, developer workflow notes, and issue-to-file relationships used throughout the dashboard.",
      importance: "High",
      language: "TypeScript",
      framework: "Zod",
      coverage: "84%",
      issueRefs: ["#204", "#233"],
    },
    {
      id: "assistant",
      title: "Repository Mentor",
      path: "lib/agents/repository-mentor.ts",
      summary:
        "Turns grounded repository context into direct answers that cite files, modules, and the best matching issue threads.",
      importance: "Core",
      language: "TypeScript",
      framework: "assistant-ui Runtime",
      coverage: "79%",
      issueRefs: ["#233"],
    },
    {
      id: "graph",
      title: "Architecture Map",
      path: "components/graphs/architecture-map.tsx",
      summary:
        "Visualizes service boundaries, key modules, and file ownership so new contributors can navigate the codebase faster.",
      importance: "High",
      language: "TypeScript",
      framework: "React Flow",
      coverage: "74%",
      issueRefs: ["#128", "#204"],
    },
    {
      id: "tests",
      title: "Contributor Safety Net",
      path: "tests/repo-analysis.e2e.ts",
      summary:
        "Exercises the analysis pipeline, contribution hints, and grounded chat behaviors against a set of fixture repositories.",
      importance: "Supporting",
      language: "TypeScript",
      framework: "Playwright",
      coverage: "68%",
      issueRefs: ["#176"],
    },
  ];

  const issues: RepoIssue[] = [
    {
      id: "#128",
      title: "Highlight missing integration points in the architecture map",
      summary:
        "New contributors struggle to see how the intake pipeline connects to the grounded chat layer.",
      difficulty: "Starter",
      module: "Architecture Map",
      files: [
        "components/graphs/architecture-map.tsx",
        "lib/indexing/build-repo-index.ts",
      ],
      labels: ["good first issue", "visualization"],
      firstStep:
        "Compare the output of lib/indexing/build-repo-index.ts against the current React Flow node labels.",
    },
    {
      id: "#176",
      title: "Add fixtures for README files with missing headings",
      summary:
        "The README parser should degrade gracefully when sections are written as plain text rather than markdown headings.",
      difficulty: "Intermediate",
      module: "GitHub Context Loader",
      files: [
        "lib/github/fetch-repo-context.ts",
        "tests/repo-analysis.e2e.ts",
      ],
      labels: ["parser", "tests"],
      firstStep:
        "Create a failing fixture repository snapshot and confirm the broken README summary in tests/repo-analysis.e2e.ts.",
    },
    {
      id: "#204",
      title: "Show test coverage badges on module cards",
      summary:
        "Coverage signals already exist in the index but are not surfaced consistently across the dashboard.",
      difficulty: "Starter",
      module: "Knowledge Index",
      files: [
        "lib/indexing/build-repo-index.ts",
        "components/graphs/architecture-map.tsx",
      ],
      labels: ["ui", "metadata"],
      firstStep:
        "Trace how coverage is serialized in the index payload, then wire that field into the module presentation layer.",
    },
    {
      id: "#233",
      title: "Cache dependency graph snapshots between analysis runs",
      summary:
        "Repeated analysis of the same repository spends too much time rebuilding the dependency map from scratch.",
      difficulty: "Stretch",
      module: "Repository Mentor",
      files: [
        "lib/agents/repository-mentor.ts",
        "lib/indexing/build-repo-index.ts",
      ],
      labels: ["performance", "caching"],
      firstStep:
        "Instrument the index build path and identify which dependency traversal can be memoized safely across runs.",
    },
  ];

  const learningPath: LearningPathStep[] = [
    {
      id: "readme",
      title: "Anchor on the README and domain model",
      summary:
        "Extract the product goal, user journey, and the main nouns that appear across issues and docs.",
      deliverables: [
        "README summary in your own words",
        "Three product questions to validate with the agent",
      ],
      files: ["README.md", "docs/product-overview.md"],
      duration: "10 min",
    },
    {
      id: "intake",
      title: "Trace the repository intake pipeline",
      summary:
        "Follow how the pasted GitHub URL becomes a grounded analysis object for the rest of the app.",
      deliverables: [
        "Call flow from route handler to index builder",
        "List of analysis inputs and outputs",
      ],
      files: [
        "app/api/repo/analyze/route.ts",
        "lib/github/fetch-repo-context.ts",
        "lib/indexing/build-repo-index.ts",
      ],
      duration: "20 min",
    },
    {
      id: "ux",
      title: "Map the UI to the backend concepts",
      summary:
        "Connect each dashboard card, badge, and graph node back to the module or issue that produced it.",
      deliverables: [
        "Architecture map annotations",
        "Module ownership notes",
      ],
      files: [
        "components/graphs/architecture-map.tsx",
        "components/dashboard/dashboard-shell.tsx",
      ],
      duration: "20 min",
    },
    {
      id: "tests",
      title: "Review the safety net before shipping",
      summary:
        "Read the tests that protect the analysis pipeline and grounded answers so your first change stays low risk.",
      deliverables: [
        "Test hotspots",
        "One new assertion you would add for your first PR",
      ],
      files: ["tests/repo-analysis.e2e.ts", "tests/chat-grounding.spec.ts"],
      duration: "15 min",
    },
    {
      id: "first-pr",
      title: "Pick a contribution issue and scope the first PR",
      summary:
        "Use the issue list, module importance, and coverage badges to choose the fastest safe contribution path.",
      deliverables: [
        "Preferred issue",
        "Files to change",
        "Validation checklist",
      ],
      files: ["issues/#128", "issues/#204"],
      duration: "15 min",
    },
  ];

  const metrics: RepoMetric[] = [
    {
      label: "Key Modules",
      value: "24",
      detail: "core ingestion, indexing, agent, graph, and tests",
    },
    {
      label: "Open Issues",
      value: "36",
      detail: "8 newcomer-friendly tasks with strong file hints",
    },
    {
      label: "Test Coverage",
      value: "82%",
      detail: "critical analysis paths are covered; graph UI still has gaps",
    },
    {
      label: "Docs Surface",
      value: "9",
      detail: "README, ADRs, contribution notes, and workflow docs",
    },
  ];

  const analysisSources: AnalysisSource[] = [
    {
      label: "README",
      detail: "entrypoint for product goal, setup, and local development",
    },
    {
      label: "Directory Tree",
      detail: "high-signal modules, app boundaries, and ownership hotspots",
    },
    {
      label: "Dependencies",
      detail: "framework choices, runtime adapters, and graph/chat tooling",
    },
    {
      label: "Tests",
      detail: "guardrails around parsing, grounding, and contribution flows",
    },
    {
      label: "Docs",
      detail: "ADRs, conventions, contributor notes, and runbooks",
    },
    {
      label: "Issues",
      detail: "beginner tasks, missing polish, and areas with known debt",
    },
  ];

  const architectureGraph = {
    nodes: [
      graphNode("repo-url", 0, 120, "GitHub URL Intake", "app/(marketing)/page.tsx", "Collects the repository link and starts analysis.", "Supporting", "TypeScript", "Next.js", "n/a"),
      graphNode("analyze-route", 270, 120, "Analysis Route", "app/api/repo/analyze/route.ts", "Starts README, tree, docs, dependency, and issue collection.", "Core", "TypeScript", "Next.js Route Handler", "82%"),
      graphNode("context-loader", 540, 30, "Context Loader", "lib/github/fetch-repo-context.ts", "Fetches and normalizes repository context.", "Core", "TypeScript", "Octokit", "91%"),
      graphNode("index-builder", 540, 210, "Knowledge Index", "lib/indexing/build-repo-index.ts", "Builds modules, workflow, and issue relationships.", "High", "TypeScript", "Zod", "84%"),
      graphNode("mentor", 840, 120, "Repository Mentor", "lib/agents/repository-mentor.ts", "Generates grounded answers and next-step recommendations.", "Core", "TypeScript", "assistant-ui Runtime", "79%"),
      graphNode("dashboard", 1110, 120, "Dashboard Workspace", "components/dashboard/dashboard-shell.tsx", "Shows overview, architecture map, and learning path.", "High", "TypeScript", "shadcn/ui", "76%"),
    ],
    edges: [
      { id: "edge-url-route", source: "repo-url", target: "analyze-route", label: "submit repo" },
      { id: "edge-route-context", source: "analyze-route", target: "context-loader", label: "fetch inputs" },
      { id: "edge-route-index", source: "analyze-route", target: "index-builder", label: "normalize structure" },
      { id: "edge-context-mentor", source: "context-loader", target: "mentor", label: "ground docs + issues" },
      { id: "edge-index-mentor", source: "index-builder", target: "mentor", label: "attach module map" },
      { id: "edge-mentor-dashboard", source: "mentor", target: "dashboard", label: "answer + tasks" },
    ],
  };

  const codeMapGraph = {
    nodes: [
      graphNode("page", 0, 100, "Landing Entry", "app/page.tsx", "Presents the intake flow and launches analysis.", "Supporting", "TypeScript", "Next.js", "n/a"),
      graphNode("hero", 260, 20, "Launch Hero", "components/sections/hero/default.tsx", "Custom hero adapted for GitHub URL paste.", "High", "TypeScript", "Launch UI", "n/a"),
      graphNode("form", 260, 180, "Repo Form", "components/landing/repo-url-form.tsx", "Validates GitHub URLs and routes into the workspace.", "Core", "TypeScript", "shadcn/ui", "n/a"),
      graphNode("shell", 560, 100, "Dashboard Shell", "components/dashboard/dashboard-shell.tsx", "Coordinates tabs, dialogs, loading state, and layout.", "Core", "TypeScript", "shadcn/ui", "80%"),
      graphNode("flow", 860, 20, "Architecture Flow", "components/dashboard/architecture-graph.tsx", "Renders architecture and code maps with React Flow.", "High", "TypeScript", "React Flow", "74%"),
      graphNode("chat", 860, 180, "Grounded Chat", "components/dashboard/repo-chat-panel.tsx", "Runs assistant-ui against the repository analysis model.", "Core", "TypeScript", "assistant-ui", "78%"),
    ],
    edges: [
      { id: "edge-page-hero", source: "page", target: "hero", label: "compose" },
      { id: "edge-page-form", source: "page", target: "form", label: "submit" },
      { id: "edge-form-shell", source: "form", target: "shell", label: "route query" },
      { id: "edge-hero-shell", source: "hero", target: "shell", label: "preview" },
      { id: "edge-shell-flow", source: "shell", target: "flow", label: "map data" },
      { id: "edge-shell-chat", source: "shell", target: "chat", label: "chat context" },
    ],
  };

  return {
    repoUrl: identity.repoUrl,
    owner: identity.owner,
    name: identity.name,
    slug,
    description:
      "Grounded onboarding workspace that explains architecture, development workflow, code conventions, and beginner contribution paths from a single GitHub repository URL.",
    branch: "main",
    commitWindow: "last 14 days",
    metrics,
    stack: [
      "TypeScript",
      "Next.js",
      "React Flow",
      "assistant-ui",
      "Playwright",
      "Octokit",
    ],
    analysisSources,
    modules,
    issues,
    workflow: [
      "Paste the repository URL and normalize GitHub metadata.",
      "Extract README, directory tree, dependencies, docs, tests, and issues in parallel.",
      "Build a module index with architecture relationships and contributor hints.",
      "Render grounded overview cards, architecture graph, and learning path.",
      "Answer developer questions with file, module, and issue references.",
    ],
    conventions: [
      "Keep repository-derived language visible in the UI: file paths, module names, and issue IDs should stay explicit.",
      "Prefer deterministic summaries over speculative explanations when repository evidence is thin.",
      "Treat tests and docs as first-class context alongside source files.",
      "Surface safe starter issues before suggesting deeper refactors.",
      "Explain developer workflow in sequence: install, run, validate, and contribute.",
    ],
    learningPath,
    suggestions: [
      `Explain the architecture of ${slug}.`,
      "Which module should I read before touching the chat layer?",
      "What is the safest good first issue here?",
      "How do tests protect the repository analysis flow?",
    ],
    architectureGraph,
    codeMapGraph,
  };
}

function graphNode(
  id: string,
  x: number,
  y: number,
  title: string,
  path: string,
  summary: string,
  importance: ImportanceLevel,
  language: string,
  framework: string,
  coverage: string,
): GraphNode {
  return {
    id,
    position: { x, y },
    data: {
      title,
      path,
      summary,
      importance,
      language,
      framework,
      coverage,
    },
  };
}

function extractLastUserPrompt(question: string) {
  return question.toLowerCase().trim();
}

export function generateAssistantResponse(
  question: string,
  analysis: RepoAnalysis,
): string {
  const prompt = extractLastUserPrompt(question);
  const starterIssue = analysis.issues.find((issue) => issue.difficulty === "Starter");
  const architectureModule = analysis.modules.find(
    (module) => module.id === "intake" || module.id === "assistant",
  );
  const testingModule = analysis.modules.find((module) => module.id === "tests");

  if (prompt.includes("architecture") || prompt.includes("structure") || prompt.includes("map")) {
    return [
      `The architecture for **${analysis.slug}** flows from \`${analysis.architectureGraph.nodes[1]?.data.path}\` into \`${analysis.architectureGraph.nodes[2]?.data.path}\` and \`${analysis.architectureGraph.nodes[3]?.data.path}\`, then finishes in \`${analysis.architectureGraph.nodes[4]?.data.path}\`.`,
      "",
      `Key module: **${analysis.modules[0]?.title}** in \`${analysis.modules[0]?.path}\` kicks off the repository scan, while **${analysis.modules[3]?.title}** in \`${analysis.modules[3]?.path}\` turns that scan into grounded answers.`,
      "",
      `Best related issue: ${analysis.issues[0]?.id} focuses on improving how the architecture map exposes integration points in \`${analysis.issues[0]?.files[0]}\`.`,
    ].join("\n");
  }

  if (prompt.includes("test") || prompt.includes("coverage") || prompt.includes("validate")) {
    return [
      `The strongest safety net lives in \`${testingModule?.path}\`, which exercises the analysis flow from URL intake through grounded output.`,
      "",
      `Coverage is highest around \`${analysis.modules[1]?.path}\` (${analysis.modules[1]?.coverage}) and weakest around \`${analysis.modules[4]?.path}\` (${analysis.modules[4]?.coverage}).`,
      "",
      `If you want a focused contribution, ${analysis.issues[1]?.id} is the most direct test-first task because it adds a failing fixture around \`${analysis.issues[1]?.files[1]}\`.`,
    ].join("\n");
  }

  if (
    prompt.includes("beginner") ||
    prompt.includes("first issue") ||
    prompt.includes("good first")
  ) {
    return [
      `The safest starter task is **${starterIssue?.id} ${starterIssue?.title}**.`,
      "",
      `Why it is beginner-friendly: it stays inside **${starterIssue?.module}**, mostly touches \`${starterIssue?.files.join("`\n- `")}\`, and already has a clear first step: ${starterIssue?.firstStep}`,
      "",
      `Read **${analysis.modules[4]?.title}** in \`${analysis.modules[4]?.path}\` first so you can verify the visual change without guessing how the graph is wired.`,
    ].join("\n");
  }

  if (
    prompt.includes("convention") ||
    prompt.includes("style") ||
    prompt.includes("workflow")
  ) {
    return [
      `For ${analysis.slug}, start with the workflow encoded in \`${analysis.modules[0]?.path}\` and \`${analysis.modules[2]?.path}\`: intake the repo, build the grounded index, then fan that data into the dashboard and chat layers.`,
      "",
      `The most important conventions are: keep file paths explicit in the UI, prefer deterministic summaries over guesses, and let tests/docs shape the explanation as much as source code.`,
      "",
      `A good reinforcement issue is ${analysis.issues[2]?.id}, because it exposes repository metadata more clearly on the module cards without changing the core analysis pipeline.`,
    ].join("\n");
  }

  return [
    `For **${analysis.slug}**, I would start with **${architectureModule?.title}** in \`${architectureModule?.path}\`, then trace into \`${analysis.modules[1]?.path}\` and \`${analysis.modules[3]?.path}\`.`,
    "",
    `Those three modules explain how the app reads README/tree/dependencies/tests/issues, turns them into the dashboard, and grounds the agent responses.`,
    "",
    `If you want a concrete next step, look at ${starterIssue?.id} and the files \`${starterIssue?.files.join("`\n- `")}\`.`,
  ].join("\n");
}

export function getSuggestedRepoTarget(repoUrl?: string | null) {
  const analysis = getRepoAnalysis(repoUrl);

  return `/dashboard?repo=${encodeURIComponent(analysis.repoUrl)}`;
}

export { isValidGitHubRepoUrl };
