"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  FolderTreeIcon,
  LibraryBigIcon,
  TestTubeDiagonalIcon,
} from "lucide-react";

import Github from "@/components/logos/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { RepoAnalysis } from "@/lib/repo-analysis";

type RepoSidebarProps = {
  analysis: RepoAnalysis;
};

export function RepoSidebar({ analysis }: RepoSidebarProps) {
  const signalItems = createSignalItems(analysis);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3 border-b">
        <div className="space-y-2 rounded-xl border bg-background/80 p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Github className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{analysis.slug}</p>
              <p className="text-xs text-muted-foreground">
                branch {analysis.branch}
              </p>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {analysis.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.stack.slice(0, 3).map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Signals analyzed</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {signalItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton tooltip={item.tooltip}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{item.value}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Priority modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysis.modules.slice(0, 4).map((module) => (
                <SidebarMenuItem key={module.id}>
                  <SidebarMenuButton
                    tooltip={module.path}
                    className="h-auto items-start p-0 hover:bg-transparent"
                  >
                    <div className="w-full rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-medium leading-snug">
                          {module.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="max-w-[7.5rem] shrink-0 whitespace-normal text-right text-[10px] leading-tight"
                        >
                          {module.coverage}
                        </Badge>
                      </div>
                      <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {module.path}
                      </p>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Best first issues</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysis.issues.slice(0, 3).map((issue) => (
                <SidebarMenuItem key={issue.id}>
                  <SidebarMenuButton tooltip={issue.title}>
                    <span>
                      {issue.id} {issue.module}
                    </span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{issue.difficulty}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="gap-3">
        <div className="rounded-xl border bg-background/80 p-3 text-xs text-muted-foreground">
          Active learning path spans {analysis.learningPath.length} steps and the
          most grounded answer sources are {analysis.analysisSources[0]?.label},
          {analysis.analysisSources[1]?.label}, and {analysis.analysisSources[5]?.label}.
        </div>
        <Button
          variant="outline"
          render={<Link href="/" />}
          nativeButton={false}
          className="w-full justify-start"
        >
          <ArrowLeftIcon className="size-4" />
          Analyze another repo
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function createSignalItems(analysis: RepoAnalysis) {
  const directorySource = analysis.analysisSources.find(
    (source) => source.label === "Directory Tree",
  );
  const testsSource = analysis.analysisSources.find(
    (source) => source.label === "Tests",
  );
  const docsSource = analysis.analysisSources.find(
    (source) => source.label === "Docs",
  );
  const dependenciesSource = analysis.analysisSources.find(
    (source) => source.label === "Dependencies",
  );

  return [
    {
      label: "README",
      icon: BookOpenIcon,
      value: "1",
      tooltip:
        analysis.analysisSources.find((source) => source.label === "README")
          ?.detail ?? "Project overview and setup framing from README.",
    },
    {
      label: "Directory tree",
      icon: FolderTreeIcon,
      value:
        extractNumericSignal(directorySource?.detail) ??
        String(Math.max(analysis.modules.length, 1)),
      tooltip:
        directorySource?.detail ??
        "High-signal directories and files selected from the repository tree.",
    },
    {
      label: "Dependencies",
      icon: LibraryBigIcon,
      value: String(Math.max(analysis.stack.length, 1)),
      tooltip:
        dependenciesSource?.detail ??
        `Primary stack signals: ${analysis.stack.join(", ")}`,
    },
    {
      label: "Tests",
      icon: TestTubeDiagonalIcon,
      value:
        extractNumericSignal(testsSource?.detail) ??
        analysis.metrics.find((metric) => metric.label === "Test Coverage")
          ?.value ??
        String(analysis.issues.length),
      tooltip:
        testsSource?.detail ??
        "Repository tests and validation signals used during analysis.",
    },
    {
      label: "Docs and issues",
      icon: LibraryBigIcon,
      value: `${extractNumericSignal(docsSource?.detail) ?? "0"} + ${analysis.issues.length}`,
      tooltip:
        docsSource?.detail ??
        "Documentation and issue context grounded the contributor guidance.",
    },
  ];
}

function extractNumericSignal(value?: string) {
  const match = value?.match(/\d+/);

  return match?.[0] ?? null;
}
