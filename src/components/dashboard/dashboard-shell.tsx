"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActivityIcon,
  BookOpenTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileCode2Icon,
  GitPullRequestIcon,
  Layers3Icon,
  ListTodoIcon,
  NetworkIcon,
  SearchCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { ArchitectureGraph } from "@/components/dashboard/architecture-graph";
import { LearningPath } from "@/components/dashboard/learning-path";
import { RepoChatPanel } from "@/components/dashboard/repo-chat-panel";
import { RepoSidebar } from "@/components/dashboard/repo-sidebar";
import { RepoUrlForm } from "@/components/landing/repo-url-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchRepoAnalysis } from "@/lib/client/repo-api";
import { cn } from "@/lib/utils";
import {
  SAMPLE_REPO_URL,
  getRepoAnalysis,
  type GraphNodeData,
  type LearningPathStep,
  type RepoAnalysis,
  type RepoIssue,
  type RepoModule,
} from "@/lib/repo-analysis";
import type { RepoDataSource } from "@/lib/repo-analysis-runtime";

const ANALYSIS_STEPS = [
  "Reading README and contributor docs",
  "Mapping the directory tree and key modules",
  "Inspecting dependencies and framework choices",
  "Scoring tests, docs, and coverage signals",
  "Linking issues to files and contribution paths",
];

type DashboardTab = "overview" | "architecture" | "learning" | "issues";
type ArchitectureView = "system-map" | "code-map";
type DetailContext = {
  kind: "module" | "issue" | "file";
  key: string;
  badgeLabel: string;
  title: string;
  subtitle: string;
  summary: string;
  badges: string[];
  secondaryTitle?: string;
  secondaryItems?: string[];
  tertiaryTitle?: string;
  tertiaryItems?: string[];
  hintLabel?: string;
  hintText?: string;
};

export function DashboardShell() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repo") ?? SAMPLE_REPO_URL;

  return <DashboardAnalysisLoader key={repoUrl} repoUrl={repoUrl} />;
}

function DashboardAnalysisLoader({ repoUrl }: { repoUrl: string }) {
  const fallbackAnalysis = useMemo(() => getRepoAnalysis(repoUrl), [repoUrl]);
  const [analysis, setAnalysis] = useState<RepoAnalysis>(fallbackAnalysis);
  const [dataSource, setDataSource] = useState<RepoDataSource>("mock");
  const [warning, setWarning] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const stepTimer = window.setInterval(() => {
      setCurrentStep((value) => (value < ANALYSIS_STEPS.length ? value + 1 : value));
    }, 350);

    void fetchRepoAnalysis(repoUrl)
      .then((response) => {
        if (!isActive) {
          return;
        }

        setAnalysis(response.analysis);
        setDataSource(response.source);
        setWarning(response.warning ?? null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setAnalysis(fallbackAnalysis);
        setDataSource("mock");
        setWarning(
          error instanceof Error
            ? error.message
            : "Falling back to mock analysis because the repository request failed.",
        );
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        window.clearInterval(stepTimer);
        setCurrentStep(ANALYSIS_STEPS.length);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      window.clearInterval(stepTimer);
    };
  }, [fallbackAnalysis, repoUrl]);

  if (isLoading) {
    return (
      <AnalysisLoadingView analysis={fallbackAnalysis} currentStep={currentStep} />
    );
  }

  return (
    <DashboardWorkspace
      key={`${analysis.repoUrl}:${dataSource}`}
      analysis={analysis}
      dataSource={dataSource}
      warning={warning}
    />
  );
}

function DashboardWorkspace({
  analysis,
  dataSource,
  warning,
}: {
  analysis: RepoAnalysis;
  dataSource: RepoDataSource;
  warning: string | null;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [architectureView, setArchitectureView] =
    useState<ArchitectureView>("system-map");
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
  const [selectedContext, setSelectedContext] = useState<DetailContext>(() =>
    getDefaultContext("overview", "system-map", analysis),
  );

  return (
    <SidebarProvider
      defaultOpen={false}
      className="min-h-screen overflow-x-hidden"
    >
      <RepoSidebar analysis={analysis} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="grid gap-4 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Repository workspace
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-xl font-semibold">
                      {analysis.slug}
                    </h1>
                    <Badge variant="brand-secondary">{analysis.branch}</Badge>
                    <Badge variant="outline">
                      {dataSource === "live" ? "Live analysis" : "Mock analysis"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  What was analyzed?
                </DialogTrigger>
                <DialogContent className="max-h-[min(80vh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Repository analysis scope</DialogTitle>
                    <DialogDescription>
                      This demo workspace grounds every card and chat response
                      in the same repository evidence bundle.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                    {analysis.analysisSources.map((source) => (
                      <Card key={source.label} className="bg-muted/30">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{source.label}</Badge>
                          </div>
                          <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
                            {source.detail}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <DialogFooter showCloseButton />
                </DialogContent>
              </Dialog>
            </div>

            <div className="w-full">
              <RepoUrlForm mode="compact" defaultValue={analysis.repoUrl} />
            </div>
            {warning ? (
              <p className="text-sm text-muted-foreground">{warning}</p>
            ) : null}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1">
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  const nextTab = value as DashboardTab;
                  setActiveTab(nextTab);
                  setSelectedContext(
                    getDefaultContext(nextTab, architectureView, analysis),
                  );
                }}
                className="min-w-0 gap-6"
              >
                <div className="overflow-x-auto">
                  <TabsList className="flex h-auto w-max min-w-full flex-wrap justify-start gap-2 bg-transparent p-0 md:min-w-0">
                    <TabsTrigger value="overview" className="flex-none">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="architecture" className="flex-none">
                      Architecture
                    </TabsTrigger>
                    <TabsTrigger value="learning" className="flex-none">
                      Learning path
                    </TabsTrigger>
                    <TabsTrigger value="issues" className="flex-none">
                      Contribution tasks
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="overview"
                  className="mt-0 min-w-0 space-y-6"
                >
                  <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {analysis.metrics.map((metric) => (
                      <Card key={metric.label}>
                        <CardHeader className="gap-1 pb-2">
                          <CardDescription>{metric.label}</CardDescription>
                          <CardTitle className="text-2xl">
                            {metric.value}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-sm text-muted-foreground">
                          {metric.detail}
                        </CardContent>
                      </Card>
                    ))}
                  </section>

                  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <Card>
                      <CardHeader className="gap-3">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="size-4 text-muted-foreground" />
                          <CardTitle>Project overview</CardTitle>
                        </div>
                        <CardDescription className="max-w-full break-words leading-relaxed">
                          {analysis.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm font-medium">Key modules</p>
                        <div className="grid gap-3">
                          {analysis.modules.slice(0, 4).map((module) => (
                            <button
                              key={module.id}
                              type="button"
                              onClick={() =>
                                setSelectedContext(createModuleContext(module))
                              }
                              className="w-full text-left"
                            >
                              <Card
                                className={cn(
                                  "bg-muted/30 transition-colors",
                                  selectedContext.kind === "module" &&
                                    selectedContext.key === module.id &&
                                    "border-primary bg-primary/5",
                                )}
                              >
                                <CardContent className="space-y-3 p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                      <p className="text-sm font-medium">
                                        {module.title}
                                      </p>
                                      <p className="max-w-full break-words font-mono text-xs text-muted-foreground">
                                        {module.path}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={
                                        module.importance === "Core"
                                          ? "default"
                                          : module.importance === "High"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {module.importance}
                                    </Badge>
                                  </div>
                                  <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
                                    {module.summary}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                      {module.language}
                                    </Badge>
                                    <Badge variant="outline">
                                      {module.framework}
                                    </Badge>
                                    <Badge variant="outline">
                                      {module.coverage} coverage
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="gap-3">
                        <div className="flex items-center gap-2">
                          <BookOpenTextIcon className="size-4 text-muted-foreground" />
                          <CardTitle>Code conventions</CardTitle>
                        </div>
                        <CardDescription>
                          Repository-derived language stays explicit throughout
                          the dashboard.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {analysis.conventions.map((convention) => (
                          <Card key={convention} className="bg-muted/30">
                            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                              <BookOpenTextIcon className="mt-0.5 size-4 shrink-0" />
                              <span className="max-w-full break-words leading-relaxed">
                                {convention}
                              </span>
                            </CardContent>
                          </Card>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="gap-3">
                      <div className="flex items-center gap-2">
                        <ActivityIcon className="size-4 text-muted-foreground" />
                        <CardTitle>Development workflow</CardTitle>
                      </div>
                      <CardDescription className="max-w-full break-words leading-relaxed">
                        The product flow stays visible from intake to grounded
                        agent response.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                      {analysis.workflow.map((step, index) => (
                        <Card key={step} className="bg-muted/30">
                          <CardContent className="space-y-3 p-4">
                            <Badge variant="outline">Step {index + 1}</Badge>
                            <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
                              {step}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="architecture"
                  className="mt-0 min-w-0 space-y-4"
                >
                  <Tabs
                    value={architectureView}
                    onValueChange={(value) => {
                      const nextView = value as ArchitectureView;
                      setArchitectureView(nextView);
                      setSelectedContext(
                        getDefaultContext("architecture", nextView, analysis),
                      );
                    }}
                    className="min-w-0 gap-4"
                  >
                    <div className="overflow-x-auto">
                      <TabsList className="flex h-auto w-max min-w-full justify-start gap-2 bg-transparent p-0 md:min-w-0">
                        <TabsTrigger value="system-map" className="flex-none">
                          Repository architecture
                        </TabsTrigger>
                        <TabsTrigger value="code-map" className="flex-none">
                          Code map
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="system-map" className="mt-0 min-w-0">
                      <ArchitectureGraph
                        key="system-map"
                        title="Repository architecture"
                        description="Follow the intake, indexing, and grounded answer pipeline without compressing the graph into a narrow column."
                        nodes={analysis.architectureGraph.nodes}
                        edges={analysis.architectureGraph.edges}
                        onSelectNode={(node) =>
                          setSelectedContext(createGraphContext(node))
                        }
                      />
                    </TabsContent>

                    <TabsContent value="code-map" className="mt-0 min-w-0">
                      <ArchitectureGraph
                        key="code-map"
                        title="Code map"
                        description="Trace how landing, dashboard, graph, and chat files connect inside the current codebase."
                        nodes={analysis.codeMapGraph.nodes}
                        edges={analysis.codeMapGraph.edges}
                        onSelectNode={(node) =>
                          setSelectedContext(createGraphContext(node))
                        }
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="learning" className="mt-0 min-w-0">
                  <LearningPath
                    analysis={analysis}
                    selectedStepId={
                      activeTab === "learning" ? selectedContext.key : undefined
                    }
                    onSelectStep={(step) =>
                      setSelectedContext(createLearningContext(step))
                    }
                  />
                </TabsContent>

                <TabsContent value="issues" className="mt-0 min-w-0 space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    {analysis.issues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        isSelected={
                          selectedContext.kind === "issue" &&
                          selectedContext.key === issue.id
                        }
                        onSelect={(nextIssue) =>
                          setSelectedContext(createIssueContext(nextIssue))
                        }
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Collapsible open={isDetailPanelOpen}>
              <aside
                className={cn(
                  "min-w-0 w-full shrink-0 xl:sticky xl:top-[8.75rem] xl:max-h-[calc(100vh-10rem)] xl:transition-[width]",
                  isDetailPanelOpen ? "xl:w-[360px]" : "xl:w-16",
                )}
              >
                <Card className="overflow-hidden xl:max-h-[calc(100vh-10rem)]">
                  <CardHeader
                    className={cn(
                      "border-b",
                      isDetailPanelOpen ? "gap-3" : "items-center p-2",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        isDetailPanelOpen
                          ? "justify-between gap-3"
                          : "justify-center",
                      )}
                    >
                      {isDetailPanelOpen ? (
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Detail panel
                          </CardTitle>
                          <CardDescription>
                            Current module, issue, or file details with Agent
                            Chat.
                          </CardDescription>
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size={isDetailPanelOpen ? "sm" : "icon-sm"}
                        onClick={() =>
                          setIsDetailPanelOpen((currentValue) => !currentValue)
                        }
                      >
                        {isDetailPanelOpen ? (
                          <>
                            Collapse
                            <ChevronRightIcon className="size-4" />
                          </>
                        ) : (
                          <>
                            <ChevronLeftIcon className="size-4" />
                            <span className="sr-only">Expand detail panel</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  <CollapsibleContent className="xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto">
                    <CardContent className="grid gap-6 p-4">
                      <DetailPanelCard context={selectedContext} />
                      <RepoChatPanel
                        analysis={analysis}
                        className="min-h-[420px] xl:min-h-[520px]"
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </aside>
            </Collapsible>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function createModuleContext(module: RepoModule): DetailContext {
  return {
    kind: "module",
    key: module.id,
    badgeLabel: "Selected module",
    title: module.title,
    subtitle: module.path,
    summary: module.summary,
    badges: [
      module.importance,
      module.language,
      module.framework,
      `${module.coverage} coverage`,
    ],
    secondaryTitle: "Related issues",
    secondaryItems: module.issueRefs,
    hintLabel: "Why this matters",
    hintText: `Start here when tracing ${module.title.toLowerCase()} because it already links to ${module.issueRefs.join(", ")}.`,
  };
}

function createIssueContext(issue: RepoIssue): DetailContext {
  return {
    kind: "issue",
    key: issue.id,
    badgeLabel: "Selected issue",
    title: `${issue.id} ${issue.title}`,
    subtitle: issue.module,
    summary: issue.summary,
    badges: [issue.difficulty, ...issue.labels],
    secondaryTitle: "Files involved",
    secondaryItems: issue.files,
    hintLabel: "Best first step",
    hintText: issue.firstStep,
  };
}

function createGraphContext(node: GraphNodeData): DetailContext {
  return {
    kind: "file",
    key: node.path,
    badgeLabel: "Selected file",
    title: node.title,
    subtitle: node.path,
    summary: node.summary,
    badges: [
      node.importance,
      node.language,
      node.framework,
      `${node.coverage} coverage`,
    ].filter((value) => value && value !== "n/a coverage"),
    hintLabel: "Use this in context",
    hintText:
      "Selecting nodes keeps the graph full width while moving the file detail into the right panel.",
  };
}

function createLearningContext(step: LearningPathStep): DetailContext {
  return {
    kind: "file",
    key: step.id,
    badgeLabel: "Selected file group",
    title: step.files[0] ?? step.title,
    subtitle: step.title,
    summary: step.summary,
    badges: [step.duration],
    secondaryTitle: "Files to inspect",
    secondaryItems: step.files,
    tertiaryTitle: "Deliverables",
    tertiaryItems: step.deliverables,
    hintLabel: "Learning goal",
    hintText: step.deliverables[0],
  };
}

function getDefaultContext(
  tab: DashboardTab,
  architectureView: ArchitectureView,
  analysis: RepoAnalysis,
) {
  if (tab === "issues") {
    return createIssueContext(analysis.issues[0]);
  }

  if (tab === "learning") {
    return createLearningContext(analysis.learningPath[0]);
  }

  if (tab === "architecture") {
    const graph =
      architectureView === "system-map"
        ? analysis.architectureGraph
        : analysis.codeMapGraph;

    return createGraphContext(graph.nodes[0].data);
  }

  return createModuleContext(analysis.modules[0]);
}

function DetailPanelCard({ context }: { context: DetailContext }) {
  const Icon =
    context.kind === "module"
      ? Layers3Icon
      : context.kind === "issue"
        ? GitPullRequestIcon
        : FileCode2Icon;

  return (
    <Card className="bg-muted/20">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-2">
            <Badge variant="brand-secondary">{context.badgeLabel}</Badge>
            <div className="space-y-1">
              <CardTitle className="break-words text-base">
                {context.title}
              </CardTitle>
              <CardDescription
                className={cn(
                  "max-w-full break-words leading-relaxed",
                  context.kind === "file" && "font-mono text-xs",
                )}
              >
                {context.subtitle}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
          {context.summary}
        </p>

        <div className="flex flex-wrap gap-2">
          {context.badges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>

        {context.secondaryItems?.length ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{context.secondaryTitle}</p>
            <div className="flex flex-wrap gap-2">
              {context.secondaryItems.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {context.tertiaryItems?.length ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{context.tertiaryTitle}</p>
            <div className="grid gap-2">
              {context.tertiaryItems.map((item) => (
                <Card key={item} className="bg-background">
                  <CardContent className="p-3 text-sm text-muted-foreground">
                    <span className="max-w-full break-words leading-relaxed">
                      {item}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {context.hintText ? (
          <Card className="bg-background">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">{context.hintLabel}</p>
              <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
                {context.hintText}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnalysisLoadingView({
  analysis,
  currentStep,
}: {
  analysis: RepoAnalysis;
  currentStep: number;
}) {
  const progressValue = Math.max(
    Math.round((currentStep / ANALYSIS_STEPS.length) * 100),
    10,
  );

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl items-center px-4 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-3 border-b">
            <div className="flex items-center gap-2">
              <SearchCheckIcon className="size-4 text-muted-foreground" />
              <CardTitle>Analyzing {analysis.slug}</CardTitle>
            </div>
            <CardDescription>
              Building the grounded repository workspace from README, tree,
              dependencies, tests, docs, and issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Pipeline progress</span>
                <span className="font-medium">{progressValue}%</span>
              </div>
              <Progress value={progressValue} />
            </div>
            <div className="grid gap-3">
              {ANALYSIS_STEPS.map((step, index) => (
                <Card
                  key={step}
                  className={
                    currentStep >= index + 1 ? "bg-primary/5" : "bg-muted/30"
                  }
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-8 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{step}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.analysisSources[index]?.detail ??
                          "Synthesizing the final contributor-ready view."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-muted/30">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <Layers3Icon className="size-4 text-muted-foreground" />
                <CardTitle>Signals already discovered</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {analysis.analysisSources.map((source) => (
                <Badge key={source.label} variant="outline">
                  {source.label}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <NetworkIcon className="size-4 text-muted-foreground" />
                <CardTitle>Modules being prioritized</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {analysis.modules.slice(0, 4).map((module) => (
                <div
                  key={module.id}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{module.title}</p>
                    <Badge
                      variant={
                        module.importance === "Core" ? "default" : "secondary"
                      }
                    >
                      {module.importance}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {module.path}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <ListTodoIcon className="size-4 text-muted-foreground" />
                <CardTitle>Starter issues queued</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {analysis.issues.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      {issue.id} {issue.title}
                    </p>
                    <Badge
                      variant={
                        issue.difficulty === "Starter"
                          ? "default"
                          : issue.difficulty === "Intermediate"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {issue.difficulty}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {issue.firstStep}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  isSelected,
  onSelect,
}: {
  issue: RepoIssue;
  isSelected: boolean;
  onSelect: (issue: RepoIssue) => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isSelected && "border-primary bg-primary/5",
      )}
      onClick={() => onSelect(issue)}
      onMouseEnter={() => onSelect(issue)}
      onFocusCapture={() => onSelect(issue)}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words text-base">
              {issue.id} {issue.title}
            </CardTitle>
            <CardDescription>{issue.module}</CardDescription>
          </div>
          <Badge
            variant={
              issue.difficulty === "Starter"
                ? "default"
                : issue.difficulty === "Intermediate"
                  ? "secondary"
                  : "destructive"
            }
          >
            {issue.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground">
          {issue.summary}
        </p>
        <div className="flex flex-wrap gap-2">
          {issue.labels.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {issue.files.map((file) => (
            <Badge key={file} variant="outline">
              {file}
            </Badge>
          ))}
        </div>

        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open issue brief
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {issue.id} {issue.title}
              </DialogTitle>
              <DialogDescription>{issue.summary}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Card className="bg-muted/30">
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium">Best first step</p>
                  <p className="text-sm text-muted-foreground">
                    {issue.firstStep}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium">Files involved</p>
                  <div className="flex flex-wrap gap-2">
                    {issue.files.map((file) => (
                      <Badge key={file} variant="outline">
                        {file}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
