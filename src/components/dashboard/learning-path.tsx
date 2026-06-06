import { ArrowRightIcon, BookMarkedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LearningPathStep, RepoAnalysis } from "@/lib/repo-analysis";

type LearningPathProps = {
  analysis: RepoAnalysis;
  selectedStepId?: string;
  onSelectStep?: (step: LearningPathStep) => void;
};

export function LearningPath({
  analysis,
  selectedStepId,
  onSelectStep,
}: LearningPathProps) {
  return (
    <div className="grid gap-4">
      {analysis.learningPath.map((step, index) => (
        <div
          key={step.id}
          className="grid items-start gap-4 md:grid-cols-[auto_minmax(0,1fr)]"
        >
          <div className="flex items-start justify-center pt-1">
            <div className="flex size-12 items-center justify-center rounded-full border bg-background text-sm font-semibold">
              {index + 1}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectStep?.(step)}
            className="w-full min-w-0 text-left"
          >
            <Card
              className={cn(
                "transition-colors",
                selectedStepId === step.id && "border-primary bg-primary/5",
              )}
            >
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="break-words text-base">{step.title}</CardTitle>
                    <CardDescription className="max-w-full break-words leading-relaxed">
                      {step.summary}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{step.duration}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookMarkedIcon className="size-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Files to inspect</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.files.map((file, index) => (
                      <Badge key={`${step.id}-file-${index}-${file}`} variant="outline">
                        {file}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Deliverables</p>
                  <div className="grid gap-2">
                    {step.deliverables.map((deliverable, index) => (
                      <Card key={`${step.id}-deliverable-${index}`} className="bg-muted/30">
                        <CardContent className="flex items-start gap-2 p-3 text-sm text-muted-foreground">
                          <ArrowRightIcon className="mt-0.5 size-4 shrink-0" />
                          <span className="max-w-full break-words leading-relaxed">
                            {deliverable}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>
      ))}
    </div>
  );
}
