"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const PROJECT_TYPES = ["Agency Work", "Consulting", "Speaking", "Partnership", "Other"];
const BUDGETS = ["Under ₹1L / mo", "₹1L–3L / mo", "₹3L–6L / mo", "₹6L+ / mo", "Not sure yet"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"name" | "email" | "projectType" | "message", string>>;

export function ContactForm() {
  const { toast } = useToast();
  const [values, setValues] = React.useState({ name: "", email: "", projectType: "", budget: "", message: "" });
  const [errors, setErrors] = React.useState<Errors>({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const set = (k: keyof typeof values) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!values.name.trim()) e.name = "Your name helps.";
    if (!EMAIL_RE.test(values.email)) e.email = "Enter a valid email.";
    if (!values.projectType) e.projectType = "Pick the closest fit.";
    if (values.message.trim().length < 10) e.message = "A sentence or two, please.";
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    // Placeholder submit — wire to Resend/an API route later. Routing logic
    // would branch on projectType to the right inbox/calendar.
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setDone(true);
    toast({ title: "Message sent", description: "I'll reply within one business day.", variant: "success" });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-card border border-border bg-card p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-6" />
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight">Message sent</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Thanks, {values.name.split(" ")[0] || "there"}. I read every message and reply within one business day —
          usually sooner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" id="name" error={errors.name}>
          <Input id="name" value={values.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={!!errors.name} placeholder="Jane Founder" />
        </Field>
        <Field label="Email" id="email" error={errors.email}>
          <Input id="email" type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} aria-invalid={!!errors.email} placeholder="jane@company.com" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Project type" id="projectType" error={errors.projectType}>
          <Select value={values.projectType} onValueChange={set("projectType")}>
            <SelectTrigger id="projectType" aria-invalid={!!errors.projectType}>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Budget (optional)" id="budget">
          <Select value={values.budget} onValueChange={set("budget")}>
            <SelectTrigger id="budget">
              <SelectValue placeholder="Choose a range" />
            </SelectTrigger>
            <SelectContent>
              {BUDGETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="What are you working on?" id="message" error={errors.message}>
        <Textarea
          id="message"
          value={values.message}
          onChange={(e) => set("message")(e.target.value)}
          aria-invalid={!!errors.message}
          placeholder="A couple of sentences about the project, timeline, and what success looks like."
          className="min-h-32"
        />
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" loading={loading}>
          Send message
          {!loading && <ArrowRight />}
        </Button>
        <p className="text-xs text-muted-foreground">Replies within one business day.</p>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
