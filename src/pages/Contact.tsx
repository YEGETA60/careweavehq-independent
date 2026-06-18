import { useState } from "react";
import { z } from "zod";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MapPin } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().email("Please enter a valid email").max(320),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Please enter a message").max(5000),
});

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "Please check the form", description: first.message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const phone = parsed.data.phone?.trim() || null;
      const { error } = await supabase.from("contact_messages").insert({
        id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone,
        message: parsed.data.message,
      });
      if (error) throw error;

      // Fire-and-await: notify the team inbox via the transactional email pipeline.
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-message",
          recipientEmail: "support@careweavehq.com",
          idempotencyKey: `contact-message-${id}`,
          templateData: {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: phone ?? undefined,
            message: parsed.data.message,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      setSent(true);
      setForm({ name: "", email: "", phone: "", message: "" });
      toast({ title: "Message sent", description: "Thanks — we'll get back to you shortly." });
    } catch (err: any) {
      toast({
        title: "Couldn't send message",
        description: err?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout
      title="Contact CareWeaveHQ | Get in touch"
      description="Send the CareWeaveHQ team a message — questions, demos, partnerships, or support."
      canonicalPath="/contact"
    >
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">Contact</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Tell us what you&apos;re trying to fix.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Whether you&apos;re evaluating CareWeaveHQ, comparing platforms, or just want to
            chat about EVV and Medicaid billing — drop us a note and the team will get back to you.
          </p>
          <div className="mt-8 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>support@careweavehq.com</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Built for home care agencies across the U.S.</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border/60 bg-background p-6 md:p-8 shadow-sm space-y-4"
        >
          {sent ? (
            <div className="text-center py-8">
              <h2 className="font-display text-2xl font-bold">Thanks for reaching out.</h2>
              <p className="mt-2 text-muted-foreground">
                Your message has been delivered to our team. We&apos;ll reply by email soon.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    maxLength={320}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@agency.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={50}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  required
                  maxLength={5000}
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="How can we help?"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending..." : "Send message"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We&apos;ll only use this to reply. No marketing, no list-rental, no nonsense.
              </p>
            </>
          )}
        </form>
      </section>
    </MarketingLayout>
  );
}