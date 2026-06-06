"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActivityIcon,
  BookOpenTextIcon,
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
import {
  RepoIssue,
  SAMPLE_REPO_URL,
  getRepoAnalysis,
} from "@/lib/repo-analysis";

const ANALYSIS_STEPS = [
  "Reading README and contributor docs",
  "Mapping the directory tree and key modules",
  "Inspecting dependencies and framework choices",
  "Scoring tests, docs, and coverage signals",
  "Linking issues to files and contribution paths",
];

export function DashboardShell() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repo") ?? SAMPLE_REPO_URL;
  const analysis = getRepoAnalysis(repoUrl);

  return <DashboardWorkspace key={analysis.repoUrl} analysis={analysis} />;
}

function DashboardWorkspace({
  analysis,
}: {
  analysis: ReturnType<typeof getRepoAnalysis>;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timers = ANALYSIS_STEPS.map((_, index) =>
      window.setTimeout(() => setCurrentStep(index + 1), 350 * (index + 1)),
    );

    const readyTimer = window.setTimeout(() => setIsReady(true), 2250);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(readyTimer);
    };
  }, []);

  if (!isReady) {
    return <AnalysisLoadingView analysis={analysis} currentStep={currentStep} />;
  }

  return (
    <SidebarProvider className="min-h-screen overflow-x-hidden">
      <RepoSidebar analysis={analysis} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="grid gap-4 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-muted-foreground">Repository workspace</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-xl font-semibold">{analysis.slug}</h1>
                    <Badge variant="brand-secondary">{analysis.branch}</Badge>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  What was analyzed?
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Repository analysis scope</DialogTitle>
                    <DialogDescription>
                      This demo workspace grounds every card and chat response in the same repository evidence bundle.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid max-h-[52vh] gap-3 overflow-y-auto pr-1">
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
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <Tabs defaultValue="overview" className="min-w-0 gap-6">
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

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="min-w-0 space-y-6">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {analysis.metrics.map((metric) => (
                      <Card key={metric.label}>
                        <CardHeader className="gap-1 pb-2">
                          <CardDescription>{metric.label}</CardDescription>
                          <CardTitle className="text-2xl">{metric.value}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-sm text-muted-foreground">
                          {metric.detail}
                        </CardContent>
                      </Card>
                    ))}
                  </section>

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
                    <CardContent className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="space-y-4">
                        <p className="text-sm font-medium">Key modules</p>
                        <div className="grid gap-3">
                          {analysis.modules.slice(0, 4).map((module) => (
                            <Card key={module.id} className="bg-muted/30">
                              <CardContent className="space-y-3 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-medium">{module.title}</p>
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
                                  <Badge variant="outline">{module.language}</Badge>
                                  <Badge variant="outline">{module.framework}</Badge>
                                  <Badge variant="outline">{module.coverage} coverage</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Code conventions</p>
                        <div className="grid gap-3">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="gap-3">
                      <div className="flex items-center gap-2">
                        <ActivityIcon className="size-4 text-muted-foreground" />
                        <CardTitle>Development workflow</CardTitle>
                      </div>
                      <CardDescription className="max-w-full break-words leading-relaxed">
                        The product flow stays visible from intake to grounded agent response.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

                <TabsContent value="architecture" className="mt-0 space-y-6">
                  <Tabs defaultValue="system-map" className="space-y-4">
                    <TabsList className="w-fit">
                      <TabsTrigger value="system-map">Repository architecture</TabsTrigger>
                      <TabsTrigger value="code-map">Code map</TabsTrigger>
                    </TabsList>
                    <TabsContent value="system-map" className="mt-0">
                      <ArchitectureGraph
                        nodes={analysis.architectureGraph.nodes}
                        edges={analysis.architectureGraph.edges}
                      />
                    </TabsContent>
                    <TabsContent value="code-map" className="mt-0">
                      <ArchitectureGraph
                        nodes={analysis.codeMapGraph.nodes}
                        edges={analysis.codeMapGraph.edges}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="learning" className="mt-0">
                  <LearningPath analysis={analysis} />
                </TabsContent>

                <TabsContent value="issues" className="mt-0 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {analysis.issues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                </TabsContent>
              </div>

              <div className="min-w-0 min-h-[720px]">
                <RepoChatPanel analysis={analysis} />
              </div>
            </div>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AnalysisLoadingView({
  analysis,
  currentStep,
}: {
  analysis: ReturnType<typeof getRepoAnalysis>;
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
              Building the grounded repository workspace from README, tree, dependencies, tests, docs, and issues.
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
                <Card key={step} className={currentStep >= index + 1 ? "bg-primary/5" : "bg-muted/30"}>
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
                <div key={module.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{module.title}</p>
                    <Badge variant={module.importance === "Core" ? "default" : "secondary"}>
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
                <div key={issue.id} className="rounded-xl border bg-background p-4">
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

function IssueCard({ issue }: { issue: RepoIssue }) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
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
        <p className="text-sm text-muted-foreground">{issue.summary}</p>
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
              <DialogDescription>
                {issue.summary}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Card className="bg-muted/30">
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium">Best first step</p>
                  <p className="text-sm text-muted-foreground">{issue.firstStep}</p>
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
