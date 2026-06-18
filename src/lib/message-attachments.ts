import { supabase } from "@/integrations/supabase/client";
import { detectPhiInFilename, sanitizeFilename, summarizeMatches } from "@/lib/phi-redaction";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

export interface UploadResult { ok: true; row: any } 
export interface UploadError { ok: false; error: string }

export async function uploadMessageAttachment(
  file: File,
  messageId: string,
  recipientId: string,
  uploaderId: string,
): Promise<UploadResult | UploadError> {
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "File exceeds 25 MB limit." };
  if (file.type && !ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: `File type not allowed: ${file.type}` };
  }
  const phi = detectPhiInFilename(file.name);
  if (phi.length > 0) {
    return { ok: false, error: `Filename contains possible PHI (${summarizeMatches(phi)}). Rename and try again.` };
  }
  const safeName = sanitizeFilename(file.name);
  const path = `${messageId}/${crypto.randomUUID()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from("message-attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) return { ok: false, error: upErr.message };

  const { data, error: insErr } = await (supabase as any).from("message_attachments").insert({
    message_id: messageId,
    uploader_id: uploaderId,
    recipient_id: recipientId,
    storage_path: path,
    file_name: safeName,
    redacted_filename: safeName,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  }).select().single();

  if (insErr) {
    await supabase.storage.from("message-attachments").remove([path]);
    return { ok: false, error: insErr.message };
  }
  return { ok: true, row: data };
}

export async function getAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("message-attachments").createSignedUrl(path, 300);
  if (error) return null;
  return data.signedUrl;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  uploader_id: string;
  recipient_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export async function loadAttachmentsForMessages(ids: string[]): Promise<Record<string, MessageAttachment[]>> {
  if (!ids.length) return {};
  const { data } = await (supabase as any).from("message_attachments").select("*").in("message_id", ids);
  const map: Record<string, MessageAttachment[]> = {};
  (data ?? []).forEach((a: MessageAttachment) => {
    (map[a.message_id] ??= []).push(a);
  });
  return map;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
