import { GitBranchIcon, MapIcon, MessageSquareIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RepoAnalysis } from "@/lib/repo-analysis";

type DashboardPreviewProps = {
  analysis: RepoAnalysis;
  compact?: boolean;
};

export function DashboardPreview({
  analysis,
  compact = false,
}: DashboardPreviewProps) {
  const topModules = analysis.modules.slice(0, compact ? 3 : 4);
  const highlightedIssues = analysis.issues.slice(0, compact ? 2 : 3);
  const spacing = compact ? "gap-3" : "gap-4";
  const titleSize = compact ? "text-sm" : "text-base";
  const descriptionSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={`grid ${spacing} bg-background/95 p-4 md:p-5`}>
      <div className={`grid ${spacing} xl:grid-cols-[1.15fr_0.85fr]`}>
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className={titleSize}>{analysis.slug}</CardTitle>
                <CardDescription className={descriptionSize}>
                  Architecture overview, grounded agent chat, and contribution path.
                </CardDescription>
              </div>
              <Badge variant="brand">AI Workspace</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.stack.slice(0, compact ? 4 : 6).map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className={`grid ${spacing}`}>
            <div className={`grid ${spacing} sm:grid-cols-2`}>
              {analysis.metrics.slice(0, 2).map((metric) => (
                <Card key={metric.label} className="bg-muted/40">
                  <CardHeader className="gap-1 pb-2">
                    <CardDescription>{metric.label}</CardDescription>
                    <CardTitle className={compact ? "text-lg" : "text-2xl"}>
                      {metric.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {metric.detail}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapIcon className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Key modules</p>
              </div>
              <div className={`grid ${spacing}`}>
                {topModules.map((module) => (
                  <Card key={module.id} className="bg-muted/30">
                    <CardContent className="flex items-start justify-between gap-3 p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{module.title}</p>
                        <p className="text-xs text-muted-foreground">{module.path}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant={module.importance === "Core" ? "default" : "secondary"}>
                          {module.importance}
                        </Badge>
                        <Badge variant="outline">{module.coverage} tests</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={`grid ${spacing}`}>
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <CardTitle className={titleSize}>Learning path</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={`grid ${spacing}`}>
              {analysis.learningPath.slice(0, compact ? 3 : 4).map((step, index) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      {index + 1}. {step.title}
                    </p>
                    <Badge variant="outline">{step.duration}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.summary}</p>
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <CardTitle className={titleSize}>Coverage and confidence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={`grid ${spacing}`}>
              {analysis.metrics.slice(2).map((metric, index) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{metric.label}</span>
                    <span className="text-muted-foreground">{metric.value}</span>
                  </div>
                  <Progress value={index === 0 ? 82 : 64} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-muted-foreground" />
            <CardTitle className={titleSize}>Beginner contribution queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent className={`grid ${spacing} lg:grid-cols-3`}>
          {highlightedIssues.map((issue) => (
            <Card key={issue.id} className="bg-muted/30">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {issue.id} {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{issue.module}</p>
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
                <div className="flex flex-wrap gap-2">
                  {issue.labels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
