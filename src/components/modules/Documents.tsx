import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { Folder, Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Documents() {
  const { user, hasRole } = useAuth();
  const { clients, caregivers } = useHomeCareContext();
  const [docs, setDocs] = useState<any[]>([]);
  const [docType, setDocType] = useState("general");
  const [clientId, setClientId] = useState<string>("");
  const [caregiverId, setCaregiverId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const upload = async () => {
    if (!file) return toast.error("Choose a file");
    setLoading(true);
    const folder = clientId ? `clients/${clientId}` : caregiverId ? `caregivers/${caregiverId}` : "general";
    const path = `${folder}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { setLoading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("documents").insert({
      storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size,
      doc_type: docType, client_id: clientId || null, caregiver_id: caregiverId || null,
      uploaded_by: user?.id ?? null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Uploaded");
    setFile(null);
    refresh();
  };

  const download = async (d: any) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = d.file_name ?? "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = async (d: any) => {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg"><Folder className="h-6 w-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">Documents</h1><p className="text-muted-foreground">Secure file storage for credentials, care plans & forms</p></div>
      </div>
      <Card>
        <CardHeader><CardTitle>Upload Document</CardTitle><CardDescription>Files are stored privately and access is role-based.</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="credential">Credential / License</SelectItem>
                <SelectItem value="care_plan">Signed Care Plan</SelectItem>
                <SelectItem value="hipaa">HIPAA Form</SelectItem>
                <SelectItem value="intake">Intake Document</SelectItem>
                <SelectItem value="invoice">Invoice / Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Client (optional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Caregiver (optional)</Label>
            <Select value={caregiverId} onValueChange={setCaregiverId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{caregivers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2"><Button onClick={upload} disabled={loading}><Upload className="h-4 w-4 mr-2" />Upload</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded p-2 text-sm">
                <div>
                  <div className="font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.doc_type} • {(d.size_bytes / 1024).toFixed(1)} KB • {new Date(d.created_at).toLocaleString()}
                    {d.client_id && ` • Client: ${clients.find((c) => c.id === d.client_id)?.name ?? ""}`}
                    {d.caregiver_id && ` • Caregiver: ${caregivers.find((c) => c.id === d.caregiver_id)?.name ?? ""}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(d)}><Download className="h-3 w-3" /></Button>
                  {hasRole("admin") && <Button size="sm" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              </div>
            ))}
            {!docs.length && <p className="text-muted-foreground text-sm">No documents yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}