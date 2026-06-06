"use client";

import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { BotIcon, MessageSquareQuoteIcon } from "lucide-react";

import { Thread } from "@/components/assistant-ui/thread";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  generateAssistantResponse,
  type RepoAnalysis,
} from "@/lib/repo-analysis";

type RepoChatPanelProps = {
  analysis: RepoAnalysis;
  className?: string;
};

export function RepoChatPanel({ analysis, className }: RepoChatPanelProps) {
  const runtime = useLocalRuntime(
    {
      async run({ messages }) {
        const latestUserText = [...messages]
          .reverse()
          .find((message) => message.role === "user")
          ?.content.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ");

        const answer = generateAssistantResponse(latestUserText ?? "", analysis);

        await new Promise((resolve) => setTimeout(resolve, 450));

        return {
          content: [
            {
              type: "reasoning" as const,
              text: `Grounding answer in ${analysis.analysisSources
                .map((source) => source.label)
                .join(", ")} for ${analysis.slug}.`,
            },
            {
              type: "text" as const,
              text: answer,
            },
          ],
        };
      },
    },
    {
      adapters: {
        suggestion: {
          async generate() {
            return analysis.suggestions.map((prompt) => ({ prompt }));
          },
        },
      },
    },
  );

  return (
    <Card className={cn("flex min-h-[560px] min-w-0 flex-col overflow-hidden", className)}>
      <CardHeader className="gap-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BotIcon className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base">Agent Chat</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ask about architecture, workflow, tests, or the safest first contribution.
              </p>
            </div>
          </div>
          <Badge variant="brand-secondary" className="gap-1.5">
            <MessageSquareQuoteIcon className="size-3.5" />
            File-grounded
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
        </AssistantRuntimeProvider>
      </CardContent>
    </Card>
  );
}
