"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

import Github from "@/components/logos/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SAMPLE_REPO_URL,
  getSuggestedRepoTarget,
  isValidGitHubRepoUrl,
} from "@/lib/repo-analysis";

type RepoUrlFormProps = {
  mode?: "hero" | "compact";
  defaultValue?: string;
};

export function RepoUrlForm({
  mode = "hero",
  defaultValue = SAMPLE_REPO_URL,
}: RepoUrlFormProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = (candidate?: string) => {
    const nextRepoUrl = (candidate ?? repoUrl).trim();

    if (!isValidGitHubRepoUrl(nextRepoUrl)) {
      setError("Paste a full GitHub repository URL, for example https://github.com/vercel/ai-chatbot.");
      return;
    }

    setError(null);

    startTransition(() => {
      router.push(`/dashboard?repo=${encodeURIComponent(nextRepoUrl)}`);
    });
  };

  if (mode === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            className="font-mono"
            aria-label="GitHub repository URL"
            disabled={isPending}
          />
          <Button type="button" onClick={() => runAnalysis()} disabled={isPending}>
            {isPending ? "Opening workspace..." : "Analyze"}
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="animate-appear relative z-10 w-full max-w-4xl opacity-0 delay-300">
      <Card className="border-border/60 bg-background/90 shadow-2xl backdrop-blur-sm">
        <CardHeader className="gap-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-400" />
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="size-2 rounded-full bg-emerald-400" />
            </div>
            <Badge variant="brand" className="gap-1.5">
              <SparklesIcon className="size-3.5" />
              Grounded analysis
            </Badge>
          </div>
          <div className="space-y-2 text-left font-mono text-sm">
            <p className="text-muted-foreground">$ paste github repository</p>
            <p className="text-foreground">
              analyze README, tree, dependencies, tests, docs, and issues
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <Input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            className="h-11 font-mono"
            aria-label="GitHub repository URL"
            disabled={isPending}
          />
            <Button type="button" size="lg" onClick={() => runAnalysis()} disabled={isPending}>
              {isPending ? "Opening workspace..." : "Analyze Repo"}
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => runAnalysis(SAMPLE_REPO_URL)}
              disabled={isPending}
            >
              <Github className="size-4" />
              Open Demo
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">README</Badge>
            <Badge variant="outline">Directory tree</Badge>
            <Badge variant="outline">Dependencies</Badge>
            <Badge variant="outline">Tests</Badge>
            <Badge variant="outline">Docs</Badge>
            <Badge variant="outline">Issues</Badge>
          </div>
          <div className="flex flex-col gap-2 text-left text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Sample demo target: {SAMPLE_REPO_URL}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(getSuggestedRepoTarget(repoUrl))}
            >
              Jump to parsed demo
            </Button>
          </div>
          {error ? (
            <p className="text-left text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
