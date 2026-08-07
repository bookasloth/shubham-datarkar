"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, ArrowRight, ArrowLeft, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitContact } from "@/lib/contact/actions";
import { readFirstTouch } from "@/components/analytics/attribution-probe";
import { EMAIL_RE } from "@/lib/validation/email";
import { cn } from "@/lib/utils";

/** Fire this event from any CTA to open the consultation modal. */
export const OPEN_LEAD_EVENT = "sd:open-lead";
/** Auto-open once per browser session at 50% scroll depth. */
const AUTO_OPEN_KEY = "sd_lead_autoopened";

type Step =
  | { key: string; type: "input"; heading: string; subtext: string; placeholder: string; summaryLabel: string }
  | { key: string; type: "options"; heading: string; options: string[]; summaryLabel: string }
  | { key: "contact"; type: "contact"; heading: string; subtext: string };

type Flow = {
  projectType: string;
  source: string;
  finalButton: string;
  successBody: string;
  /** Which answer key (if any) maps to the contacts `budget` column. */
  budgetKey?: string;
  steps: Step[];
};

const SEO_FLOW: Flow = {
  projectType: "SEO Consultation (Nagpur)",
  source: "SEO Expert in Nagpur — consultation modal.",
  finalButton: "Book My Free Consultation",
  successBody:
    "I've got your details and I'll reach out within one business day to confirm your free 30-minute SEO consultation.",
  budgetKey: "budget",
  steps: [
    {
      key: "website",
      type: "input",
      heading: "Let's start with your website",
      subtext: "Answer a few quick questions and I'll prepare a tailored plan for your free 30-minute SEO consultation.",
      placeholder: "yourbusiness.com",
      summaryLabel: "Website",
    },
    {
      key: "businessType",
      type: "options",
      heading: "What kind of business do you run?",
      summaryLabel: "Business type",
      options: ["Local business", "Ecommerce / D2C", "SaaS / Startup", "Real estate", "Professional services", "Other"],
    },
    {
      key: "goal",
      type: "options",
      heading: "What do you want more of from Google?",
      summaryLabel: "Primary goal",
      options: ["More leads & enquiries", "More sales / orders", "More calls & walk-ins", "More brand visibility"],
    },
    {
      key: "revenue",
      type: "options",
      heading: "What's your approximate annual revenue?",
      summaryLabel: "Annual revenue",
      options: ["₹0 – ₹50 Lakhs", "₹50 Lakhs – ₹1 Crore", "₹1 Crore – ₹3 Crore", "₹3 Crore+", "Prefer not to say"],
    },
    {
      key: "budget",
      type: "options",
      heading: "Monthly marketing budget?",
      summaryLabel: "Marketing budget",
      options: ["Under ₹60,000", "₹60,000 – ₹1.5L", "₹1.5L – ₹5L", "₹5L – ₹20L", "₹20L+", "Not sure yet"],
    },
    {
      key: "timeline",
      type: "options",
      heading: "How soon do you want to start?",
      summaryLabel: "Start timeline",
      options: ["Immediately", "Within a month", "In 1–3 months", "Just exploring"],
    },
    {
      key: "contact",
      type: "contact",
      heading: "Where should I send your consultation details?",
      subtext: "I'll confirm your slot and share what to prepare. No spam, ever.",
    },
  ],
};

const WEBDEV_FLOW: Flow = {
  projectType: "Web Design & Development (Nagpur)",
  source: "Web Developer & Design in Nagpur — consultation modal.",
  finalButton: "Book My Free Consultation",
  successBody:
    "I've got your project details and I'll reach out within one business day to plan your free design & build consultation.",
  budgetKey: "budget",
  steps: [
    {
      key: "need",
      type: "options",
      heading: "What do you need built?",
      summaryLabel: "Project",
      options: ["A new website", "A redesign", "An e-commerce store", "A web app / SaaS", "A landing page", "Not sure yet"],
    },
    {
      key: "businessType",
      type: "options",
      heading: "Who's it for?",
      summaryLabel: "Business type",
      options: ["Local business", "Ecommerce / D2C brand", "Startup / SaaS", "Real estate", "Agency / studio", "Personal / portfolio", "Other"],
    },
    {
      key: "website",
      type: "input",
      heading: "Got a current site or a reference?",
      subtext: "Paste your existing website or a link you love — or just skip and continue.",
      placeholder: "yourbusiness.com (optional)",
      summaryLabel: "Current site / reference",
    },
    {
      key: "budget",
      type: "options",
      heading: "Rough budget for the project?",
      summaryLabel: "Project budget",
      options: ["Under ₹25,000", "₹25,000 – ₹75,000", "₹75,000 – ₹2L", "₹2L – ₹5L", "₹5L+", "Not sure yet"],
    },
    {
      key: "timeline",
      type: "options",
      heading: "How soon do you want to launch?",
      summaryLabel: "Timeline",
      options: ["ASAP", "Within a month", "In 1–3 months", "Just exploring"],
    },
    {
      key: "contact",
      type: "contact",
      heading: "Where should I send your consultation details?",
      subtext: "I'll confirm your slot and what to prepare. No spam, ever.",
    },
  ],
};

const FLOWS = { seo: SEO_FLOW, webdev: WEBDEV_FLOW } as const;

type Answers = Record<string, string>;
type ContactErrors = Partial<Record<"name" | "phone" | "email", string>>;

export function LeadModal({ variant = "seo" }: { variant?: "seo" | "webdev" }) {
  const flow = FLOWS[variant];
  const steps = flow.steps;
  const total = steps.length;

  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [contact, setContact] = React.useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = React.useState<ContactErrors>({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const autoOpened = React.useRef(false);

  React.useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener(OPEN_LEAD_EVENT, openIt);
    return () => window.removeEventListener(OPEN_LEAD_EVENT, openIt);
  }, []);

  React.useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(AUTO_OPEN_KEY)) {
      autoOpened.current = true;
      return;
    }
    const onScroll = () => {
      if (autoOpened.current) return;
      const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (depth >= 0.5) {
        autoOpened.current = true;
        try {
          sessionStorage.setItem(AUTO_OPEN_KEY, "1");
        } catch {
          /* private mode — best effort */
        }
        setOpen(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = steps[step];
  const progressPct = Math.round(((step + 1) / total) * 100);

  function choose(value: string) {
    setAnswers((a) => ({ ...a, [current.key]: value }));
    setStep((s) => Math.min(s + 1, total - 1));
  }
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    const e: ContactErrors = {};
    if (!contact.name.trim()) e.name = "Your name helps.";
    if (contact.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a reachable phone number.";
    if (!EMAIL_RE.test(contact.email)) e.email = "Enter a valid email.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setSubmitError(null);
    const summary = steps
      .filter((s): s is Extract<Step, { summaryLabel: string }> => s.type !== "contact")
      .map((s) => `${s.summaryLabel}: ${answers[s.key]?.trim() || "—"}`);
    const message = [...summary, `Phone: ${contact.phone.trim()}`, "", `Source: ${flow.source}`].join("\n");

    try {
      const res = await submitContact({
        name: contact.name,
        email: contact.email,
        projectType: flow.projectType,
        budget: flow.budgetKey ? answers[flow.budgetKey] || undefined : undefined,
        message,
        attribution: readFirstTouch(),
      });
      if (!res.ok) {
        setSubmitError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setSubmitError("Network error. Please try again, or WhatsApp me directly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[100] overflow-y-auto bg-background px-5 py-16 focus:outline-none sm:py-20"
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute right-5 top-5 rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="size-5" />
          </Dialog.Close>

          <div className="mx-auto w-full max-w-xl">
            {done ? (
              <div className="flex flex-col items-center pt-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-brand text-brand-foreground">
                  <Check className="size-7" />
                </div>
                <Dialog.Title className="mt-6 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                  You&rsquo;re booked in — nearly there
                </Dialog.Title>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Thanks, {contact.name.split(" ")[0] || "there"}. {flow.successBody}
                </p>
                <Dialog.Close asChild>
                  <Button size="lg" className="mt-8">
                    Done
                  </Button>
                </Dialog.Close>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>
                      Step {step + 1} of {total}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <Dialog.Title className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                  {current.heading}
                </Dialog.Title>

                {current.type === "input" && (
                  <div className="mt-4">
                    <p className="text-muted-foreground">{current.subtext}</p>
                    <Input
                      autoFocus
                      value={answers[current.key] ?? ""}
                      onChange={(ev) => setAnswers((a) => ({ ...a, [current.key]: ev.target.value }))}
                      onKeyDown={(ev) => ev.key === "Enter" && next()}
                      placeholder={current.placeholder}
                      className="mt-6 h-14 text-base"
                    />
                    <Button size="lg" className="mt-6 w-full" onClick={next}>
                      Continue
                      <ArrowRight />
                    </Button>
                  </div>
                )}

                {current.type === "options" && (
                  <div className="mt-8 grid gap-3">
                    {current.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => choose(opt)}
                        className={cn(
                          "w-full rounded-input border px-5 py-4 text-left text-base transition-ui hover:border-brand hover:bg-accent",
                          answers[current.key] === opt ? "border-brand bg-brand/10 font-medium" : "border-border",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={back}
                        className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-ui hover:text-foreground"
                      >
                        <ArrowLeft className="size-3.5" /> Back
                      </button>
                    )}
                  </div>
                )}

                {current.type === "contact" && (
                  <div className="mt-4">
                    <p className="text-muted-foreground">{current.subtext}</p>
                    <div className="mt-6 grid gap-4">
                      <ContactField label="Full name" error={errors.name}>
                        <Input
                          value={contact.name}
                          onChange={(ev) => setContact((cc) => ({ ...cc, name: ev.target.value }))}
                          placeholder="Your name"
                          className="h-13"
                        />
                      </ContactField>
                      <ContactField label="Phone / WhatsApp" error={errors.phone}>
                        <Input
                          type="tel"
                          value={contact.phone}
                          onChange={(ev) => setContact((cc) => ({ ...cc, phone: ev.target.value }))}
                          placeholder="+91 ..."
                          className="h-13"
                        />
                      </ContactField>
                      <ContactField label="Email" error={errors.email}>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(ev) => setContact((cc) => ({ ...cc, email: ev.target.value }))}
                          placeholder="you@business.com"
                          className="h-13"
                        />
                      </ContactField>
                    </div>
                    {submitError && (
                      <p className="mt-4 text-sm text-danger" role="alert">
                        {submitError}
                      </p>
                    )}
                    <Button size="lg" className="mt-6 w-full" onClick={submit} loading={loading}>
                      {!loading && <CalendarCheck />}
                      {flow.finalButton}
                    </Button>
                    <button
                      type="button"
                      onClick={back}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-ui hover:text-foreground"
                    >
                      <ArrowLeft className="size-3.5" /> Back
                    </button>
                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      Free 30-minute consultation. No obligation.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ContactField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 text-left">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
