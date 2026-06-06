import "server-only";

import { getRepoRuntimeConfig } from "@/lib/server/repo-runtime-config";

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekCompletionOptions = {
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
};

export async function createDeepSeekCompletion(
  messages: DeepSeekMessage[],
  options: DeepSeekCompletionOptions = {},
) {
  const config = await getRepoRuntimeConfig();

  if (!config.apiKey) {
    throw new Error("DeepSeek API key is not configured.");
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? config.model,
      messages,
      max_tokens: options.maxTokens ?? 1800,
      response_format: options.jsonMode
        ? {
            type: "json_object",
          }
        : {
            type: "text",
          },
      thinking: {
        type: "disabled",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `DeepSeek request failed with ${response.status}: ${errorText.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
      finish_reason?: string;
    }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";

  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return {
    content,
    finishReason: payload.choices?.[0]?.finish_reason ?? null,
  };
}
