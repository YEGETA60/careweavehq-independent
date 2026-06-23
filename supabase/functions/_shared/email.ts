import { sendLovableEmail } from "npm:@lovable.dev/email-js";

export type TransactionalEmail = {
  run_id?: string;
  to: string;
  from: string;
  sender_domain?: string;
  subject: string;
  html?: string;
  text?: string;
  purpose?: string;
  label?: string;
  idempotency_key?: string;
  unsubscribe_token?: string;
  message_id?: string;
};

class EmailProviderError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "EmailProviderError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function hasEmailProvider(): boolean {
  return Boolean(Deno.env.get("RESEND_API_KEY") || Deno.env.get("LOVABLE_API_KEY"));
}

export async function sendTransactionalEmail(
  payload: TransactionalEmail,
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (resendApiKey) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    };
    if (payload.idempotency_key) {
      headers["Idempotency-Key"] = payload.idempotency_key.slice(0, 256);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") || payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
      throw new EmailProviderError(
        `Resend API error ${response.status}: ${detail}`,
        response.status,
        Number.isFinite(retryAfter) ? retryAfter : null,
      );
    }
    return;
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new EmailProviderError("Email provider is not configured", 500);
  }

  await sendLovableEmail(payload, {
    apiKey: lovableApiKey,
    sendUrl: Deno.env.get("LOVABLE_SEND_URL"),
  });
}
