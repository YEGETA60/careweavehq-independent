import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { getAttachmentSignedUrl, formatBytes, type MessageAttachment } from "@/lib/message-attachments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MessageAttachmentChip({ a, mine }: { a: MessageAttachment; mine: boolean }) {
  const [loading, setLoading] = useState(false);
  const isImage = a.mime_type.startsWith("image/");
  const open = async () => {
    setLoading(true);
    const url = await getAttachmentSignedUrl(a.storage_path);
    setLoading(false);
    if (!url) return toast.error("Unable to load attachment");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs w-full text-left hover:opacity-80 transition",
        mine ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background"
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      <span className="flex-1 truncate">{a.file_name}</span>
      <span className="opacity-70">{formatBytes(a.size_bytes)}</span>
      <Download className="h-3 w-3 opacity-70" />
    </button>
  );
}

export function AttachButton({
  onPick,
  disabled,
}: { onPick: (files: FileList) => void; disabled?: boolean }) {
  return (
    <label className="inline-flex">
      <input
        type="file"
        className="hidden"
        multiple
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <Button asChild variant="outline" size="icon" disabled={disabled}>
        <span><Paperclip className="h-4 w-4" /></span>
      </Button>
    </label>
  );
}
