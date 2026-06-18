import { useEffect, useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Printer, BookOpen, FileSignature, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PACKET_SECTIONS, PACKET_TITLE, PACKET_DISCLAIMER } from "@/lib/intake-packet-content";
import { printPage } from "@/lib/print-utils";
import { SignaturePad } from "@/components/SignaturePad";

interface PacketAcknowledgement {
  id: string;
  clientName: string;
  representativeName?: string;
  acknowledgedAt: string;
  signature: string;
}

const STORAGE_KEY = "carweave.packet.acknowledgements";

function loadAcks(): PacketAcknowledgement[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function IntakePacket() {
  const [clientName, setClientName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [received, setReceived] = useState(false);
  const [signature, setSignature] = useState("");
  const [acks, setAcks] = useState<PacketAcknowledgement[]>([]);

  useEffect(() => setAcks(loadAcks()), []);

  const persist = (next: PacketAcknowledgement[]) => {
    setAcks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSign = () => {
    if (!clientName.trim()) return toast.error("Client name is required");
    if (!reviewed || !received) return toast.error("Both acknowledgements must be checked");
    if (signature.length < 20) return toast.error("Please capture a signature");
    const entry: PacketAcknowledgement = {
      id: crypto.randomUUID(),
      clientName: clientName.trim(),
      representativeName: representativeName.trim() || undefined,
      acknowledgedAt: new Date().toISOString(),
      signature,
    };
    persist([entry, ...acks]);
    toast.success("Acknowledgement recorded");
    setClientName("");
    setRepresentativeName("");
    setReviewed(false);
    setReceived(false);
    setSignature("");
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Remove this acknowledgement record?")) return;
    persist(acks.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{PACKET_TITLE}</CardTitle>
                <CardDescription>
                  Standard policies and notices to share with every new client at admission.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={printPage}>
              <Printer className="h-4 w-4" /> Print full packet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">{PACKET_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {/* Interactive accordion (screen) */}
      <div className="space-y-4 no-print">
        {PACKET_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {section.items.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-left">{item.title}</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {item.body}
                      </div>
                      {item.source && (
                        <p className="text-xs text-muted-foreground mt-3 italic">
                          Reference: {item.source}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4.1 E-signature acknowledgement */}
      <Card className="no-print border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>4.1 Consent for Services & Verification of Receipt</CardTitle>
              <CardDescription>
                Record that the client (or representative) has reviewed and received this packet.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ack-client">Client Name *</Label>
              <Input
                id="ack-client"
                value={clientName}
                maxLength={100}
                onChange={e => setClientName(e.target.value)}
                placeholder="Full legal name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ack-rep">Representative Name (if signing on behalf)</Label>
              <Input
                id="ack-rep"
                value={representativeName}
                maxLength={100}
                onChange={e => setRepresentativeName(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={reviewed}
              onCheckedChange={v => setReviewed(v === true)}
              className="mt-0.5"
            />
            <span>
              I confirm that the contents of this Client Information & Admission Packet
              (Sections 1–4) have been reviewed with me and my questions have been answered.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={received}
              onCheckedChange={v => setReceived(v === true)}
              className="mt-0.5"
            />
            <span>
              I acknowledge receipt of a copy of the packet, including the HIPAA Notice of
              Privacy Practices, Client Rights, and Emergency/Disaster information.
            </span>
          </label>
          <SignaturePad
            label="Signature of Client / Representative *"
            value={signature}
            onChange={setSignature}
          />
          <div className="flex justify-end">
            <Button onClick={handleSign}>
              <FileSignature className="h-4 w-4 mr-2" /> Record Acknowledgement
            </Button>
          </div>
        </CardContent>
      </Card>

      {acks.length > 0 && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-lg">Acknowledgement Records</CardTitle>
            <CardDescription>{acks.length} on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {acks.map(a => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 border rounded-lg p-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={a.signature}
                    alt="Signature"
                    className="h-12 w-28 object-contain border rounded bg-background shrink-0"
                  />
                  <div className="text-sm min-w-0">
                    <div className="font-medium truncate">{a.clientName}</div>
                    {a.representativeName && (
                      <div className="text-muted-foreground text-xs truncate">
                        Signed by: {a.representativeName}
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">
                      {new Date(a.acknowledgedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Signed
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Print version (always rendered but hidden on screen) */}
      <div className="hidden print:block print:p-6">
        <h1 className="text-2xl font-bold mb-2">{PACKET_TITLE}</h1>
        <p className="text-xs italic mb-6">{PACKET_DISCLAIMER}</p>
        {PACKET_SECTIONS.map((section) => (
          <div key={section.id} className="mb-6 break-inside-avoid">
            <h2 className="text-lg font-bold border-b mb-2">{section.title}</h2>
            {section.items.map((item) => (
              <div key={item.id} className="mb-4 break-inside-avoid">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{item.body}</div>
                {item.source && (
                  <p className="text-xs italic mt-1">Reference: {item.source}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}