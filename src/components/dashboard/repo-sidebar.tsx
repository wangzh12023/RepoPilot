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
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="README and product framing">
                  <BookOpenIcon />
                  <span>README</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>1</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="High-signal folders and files">
                  <FolderTreeIcon />
                  <span>Directory tree</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>24</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Repository tests and coverage hints">
                  <TestTubeDiagonalIcon />
                  <span>Tests</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>118</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="ADRs, docs, and contributor notes">
                  <LibraryBigIcon />
                  <span>Docs and issues</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>45</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Priority modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysis.modules.slice(0, 4).map((module) => (
                <SidebarMenuItem key={module.id}>
                  <SidebarMenuButton tooltip={module.path}>
                    <span>{module.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{module.coverage}</SidebarMenuBadge>
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
