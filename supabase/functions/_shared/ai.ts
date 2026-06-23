export type AIProviderOptions = {
  lovableModel: string;
  directModel?: string;
  modelEnv?: string;
};

function directApiKey(): string | undefined {
  return Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY") || undefined;
}

export function hasAIProvider(): boolean {
  return Boolean(directApiKey() || Deno.env.get("LOVABLE_API_KEY"));
}

export function usesDirectAIProvider(): boolean {
  return Boolean(directApiKey());
}

export async function createChatCompletion(
  payload: Record<string, unknown>,
  options: AIProviderOptions,
): Promise<Response> {
  const directKey = directApiKey();
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const useDirectProvider = Boolean(directKey);
  const key = directKey || lovableKey;

  if (!key) throw new Error("AI provider is not configured");

  const baseUrl = useDirectProvider
    ? (Deno.env.get("AI_BASE_URL") || "https://api.openai.com/v1")
    : "https://ai.gateway.lovable.dev/v1";
  const model =
    (options.modelEnv ? Deno.env.get(options.modelEnv) : undefined) ||
    Deno.env.get("AI_MODEL") ||
    (useDirectProvider ? options.directModel : undefined) ||
    options.lovableModel;

  return fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, model }),
  });
}
