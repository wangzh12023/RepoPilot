import { NextResponse } from "next/server";

import type { RepoAnalysis } from "@/lib/repo-analysis";
import type { RepoChatMessage, RepoModeOverride } from "@/lib/repo-analysis-runtime";
import { answerRepositoryQuestion } from "@/lib/server/live-repo-analysis";

export const dynamic = "force-dynamic";

type RepoChatRequestBody = {
  repoUrl?: string;
  analysis?: RepoAnalysis;
  messages?: RepoChatMessage[];
  mode?: RepoModeOverride;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RepoChatRequestBody;

    if (!body.repoUrl || !body.analysis || !body.messages?.length) {
      return NextResponse.json(
        {
          error: "repoUrl, analysis, and messages are required.",
        },
        {
          status: 400,
        },
      );
    }

    const payload = await answerRepositoryQuestion({
      repoUrl: body.repoUrl,
      analysis: body.analysis,
      messages: body.messages,
      modeOverride: body.mode,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat request failed.",
      },
      {
        status: 500,
      },
    );
  }
}
