import { ArrowRightIcon, BookMarkedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepoAnalysis } from "@/lib/repo-analysis";

type LearningPathProps = {
  analysis: RepoAnalysis;
};

export function LearningPath({ analysis }: LearningPathProps) {
  return (
    <div className="grid gap-4">
      {analysis.learningPath.map((step, index) => (
        <div key={step.id} className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="flex items-start justify-center">
            <div className="flex size-12 items-center justify-center rounded-full border bg-background text-sm font-semibold">
              {index + 1}
            </div>
          </div>
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <CardDescription>{step.summary}</CardDescription>
                </div>
                <Badge variant="outline">{step.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookMarkedIcon className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Files to inspect</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {step.files.map((file) => (
                    <Badge key={file} variant="outline">
                      {file}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Deliverables</p>
                <div className="grid gap-2">
                  {step.deliverables.map((deliverable) => (
                    <Card key={deliverable} className="bg-muted/30">
                      <CardContent className="flex items-start gap-2 p-3 text-sm text-muted-foreground">
                        <ArrowRightIcon className="mt-0.5 size-4 shrink-0" />
                        {deliverable}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
