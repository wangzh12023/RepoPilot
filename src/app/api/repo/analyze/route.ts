import { NextResponse } from "next/server";

import { analyzeRepository } from "@/lib/server/live-repo-analysis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repo");
  const mode = searchParams.get("mode");

  if (!repoUrl) {
    return NextResponse.json(
      {
        error: "Missing repo query parameter.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const payload = await analyzeRepository(
      repoUrl,
      mode === "mock" || mode === "live" || mode === "auto" ? mode : null,
    );

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Repository analysis failed.",
      },
      {
        status: 500,
      },
    );
  }
}
