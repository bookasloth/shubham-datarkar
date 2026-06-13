"use client";

import * as React from "react";
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Rating } from "@/components/ui/rating";
import { TagInput } from "@/components/ui/tag-input";
import { OtpInput } from "@/components/ui/otp-input";
import { Dropzone } from "@/components/ui/dropzone";
import { Combobox } from "@/components/ui/combobox";
import { Progress } from "@/components/ui/progress";
import { StatCounter } from "@/components/ui/stat-counter";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Banner } from "@/components/ui/banner";
import { CodeBlock } from "@/components/ui/code-block";
import { Stepper } from "@/components/ui/stepper";
import { Timeline } from "@/components/ui/timeline";
import { PricingTable } from "@/components/ui/pricing-table";
import { Carousel } from "@/components/ui/carousel";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const sections = [
  { id: "forms", label: "Form & input" },
  { id: "display", label: "Display & feedback" },
  { id: "blocks", label: "Composed blocks" },
];

function Block({ n, title, desc, children, className }: { n: number; title: string; desc: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="scroll-mt-24">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-xs font-bold tabular-nums text-muted-foreground/60">{String(n).padStart(2, "0")}</span>
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className={cn("flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6", className)}>{children}</div>
    </div>
  );
}

function GroupHeading({ id, label }: { id: string; label: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 border-b border-border pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </h2>
  );
}

const cities = [
  { value: "pune", label: "Pune" },
  { value: "mumbai", label: "Mumbai" },
  { value: "bangalore", label: "Bangalore" },
  { value: "hyderabad", label: "Hyderabad" },
  { value: "delhi", label: "Delhi" },
];

const plans = [
  { name: "Starter", monthly: 75000, annual: 60000, blurb: "For a single focused initiative.", features: ["One growth channel", "Monthly reporting", "Async support"] },
  { name: "Growth", monthly: 150000, annual: 120000, blurb: "The compounding system.", features: ["Multi-channel system", "Bi-weekly sessions", "Priority support", "Quarterly strategy"], featured: true, cta: "Start growing" },
  { name: "Scale", monthly: 300000, annual: 240000, blurb: "Full-stack, hands-on.", features: ["Everything in Growth", "Dedicated roadmap", "Embedded team", "Weekly reviews"] },
];

const feed = [
  { initials: "AR", text: "Aditi subscribed to the newsletter", time: "2m" },
  { initials: "KM", text: "Karan booked a working session", time: "1h" },
  { initials: "PN", text: "Priya ran the SEO audit tool", time: "3h" },
];

export function ComponentsGallery2() {
  const [slider, setSlider] = React.useState<number[]>([40]);

  return (
    <>
      <nav aria-label="Component categories" className="mb-12 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium transition-ui hover:bg-accent">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-16">
        {/* FORMS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="forms" label="Form & input" />

          <Block n={1} title="Radio group" desc="Single choice from a set." className="flex-col items-stretch">
            <RadioGroup defaultValue="seo">
              {[
                { v: "seo", l: "SEO & organic growth" },
                { v: "performance", l: "Performance marketing" },
                { v: "ai", l: "AI automation" },
              ].map((o) => (
                <label key={o.v} className="flex items-center gap-3 text-sm">
                  <RadioGroupItem value={o.v} id={`rg-${o.v}`} />
                  {o.l}
                </label>
              ))}
            </RadioGroup>
          </Block>

          <Block n={2} title="Slider" desc="Range selection with live value." className="flex-col items-stretch">
            <div className="flex items-center gap-4">
              <Slider value={slider} onValueChange={setSlider} max={100} step={1} className="max-w-sm" />
              <span className="w-10 text-sm font-medium tabular-nums">{slider[0]}</span>
            </div>
          </Block>

          <Block n={3} title="Toggle group" desc="Segmented control, single select.">
            <ToggleGroup type="single" defaultValue="left" aria-label="Alignment">
              <ToggleGroupItem value="left" aria-label="Left"><AlignLeft /></ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Center"><AlignCenter /></ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Right"><AlignRight /></ToggleGroupItem>
            </ToggleGroup>
          </Block>

          <Block n={4} title="Star rating" desc="Interactive, keyboard accessible.">
            <Rating defaultValue={4} />
            <Rating defaultValue={3} readOnly />
            <span className="text-sm text-muted-foreground">(read-only)</span>
          </Block>

          <Block n={5} title="Tag input" desc="Add with Enter or comma, remove with backspace." className="flex-col items-stretch">
            <TagInput defaultTags={["seo", "ai", "growth"]} className="max-w-md" />
          </Block>

          <Block n={6} title="OTP input" desc="Verification code, paste-aware.">
            <OtpInput length={6} />
          </Block>

          <Block n={7} title="File dropzone" desc="Drag & drop or browse." className="flex-col items-stretch">
            <Dropzone className="max-w-md" />
          </Block>

          <Block n={8} title="Combobox" desc="Searchable select." className="flex-col items-stretch">
            <div className="max-w-xs">
              <Combobox options={cities} placeholder="Select a city" searchPlaceholder="Search cities…" />
            </div>
          </Block>
        </section>

        {/* DISPLAY */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="display" label="Display & feedback" />

          <Block n={9} title="Progress" desc="Determinate and indeterminate." className="flex-col items-stretch">
            <div className="w-full max-w-md space-y-4">
              <Progress value={66} />
              <Progress indeterminate />
            </div>
          </Block>

          <Block n={10} title="Stat counter" desc="Counts up when scrolled into view.">
            <div className="flex gap-10">
              <div>
                <StatCounter value={50000} suffix="+" className="font-display text-3xl font-extrabold tracking-tight" />
                <div className="text-sm text-muted-foreground">Organic visitors</div>
              </div>
              <div>
                <StatCounter value={3.1} decimals={1} suffix="x" className="font-display text-3xl font-extrabold tracking-tight" />
                <div className="text-sm text-muted-foreground">Blended ROAS</div>
              </div>
            </div>
          </Block>

          <Block n={11} title="Hover card" desc="Rich preview on hover/focus.">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">@kalamwala</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback>SD</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-semibold">Shubham Datarkar</p>
                    <p className="text-xs text-muted-foreground">Founder · The Kalamwala</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Builds compounding growth systems and ships SaaS products.</p>
              </HoverCardContent>
            </HoverCard>
          </Block>

          <Block n={12} title="Collapsible" desc="Show and hide content." className="flex-col items-stretch">
            <Collapsible className="w-full max-w-md">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-input border border-border px-4 py-3 text-sm font-medium transition-ui hover:bg-accent [&[data-state=open]>svg]:rotate-180">
                What’s included?
                <ChevronDown className="size-4 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 py-3 text-sm text-muted-foreground">
                A full audit, the system design, the build, and a handover so it runs without me.
              </CollapsibleContent>
            </Collapsible>
          </Block>

          <Block n={13} title="Announcement banner" desc="Dismissible notice bar." className="flex-col items-stretch p-0">
            <Banner variant="inverted" className="w-full rounded-card">
              <Sparkles className="size-3.5" />
              New: the free SEO audit tool is live.
            </Banner>
          </Block>

          <Block n={14} title="Code block" desc="Filename header with copy." className="flex-col items-stretch">
            <CodeBlock
              filename="cn.ts"
              code={`import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport const cn = (...c) => twMerge(clsx(c));`}
              className="w-full max-w-lg"
            />
          </Block>
        </section>

        {/* BLOCKS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="blocks" label="Composed blocks" />

          <Block n={15} title="Stepper" desc="Multi-step progress." className="flex-col items-stretch">
            <Stepper
              current={1}
              steps={[
                { label: "Audit", description: "Find what's winnable" },
                { label: "Design", description: "The mechanism" },
                { label: "Build", description: "Ship it" },
                { label: "Compound", description: "Hand over" },
              ]}
            />
          </Block>

          <Block n={16} title="Timeline" desc="Reusable vertical timeline." className="flex-col items-stretch">
            <Timeline
              items={[
                { marker: "2021", title: "Founded the agency" },
                { marker: "2024", title: "Started the SaaS studio" },
                { marker: "2026", title: "Built the Digital HQ" },
              ]}
            />
          </Block>

          <Block n={17} title="Pricing table" desc="Three tiers, monthly/annual toggle." className="flex-col items-stretch">
            <PricingTable plans={plans} />
          </Block>

          <Block n={18} title="Carousel" desc="Scroll-snap with controls." className="flex-col items-stretch">
            <Carousel itemClassName="w-72">
              {["SEO system", "Content OS", "Audit suite", "Founder OS", "Scheduler"].map((t) => (
                <Card key={t} className="h-40 p-6">
                  <Badge variant="muted">Product</Badge>
                  <p className="mt-4 text-lg font-semibold">{t}</p>
                </Card>
              ))}
            </Carousel>
          </Block>

          <Block n={19} title="Sheet / drawer" desc="Slide-in side panel.">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Refine what you see.</SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <p className="text-sm text-muted-foreground">Sheet content goes here — forms, filters, details, anything.</p>
                </SheetBody>
                <div className="border-t border-border p-6">
                  <SheetClose asChild>
                    <Button className="w-full">Apply</Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </Block>

          <Block n={20} title="Notification feed + avatar group" desc="Activity items and a stacked avatar group." className="flex-col items-stretch gap-6">
            <AvatarGroup items={[{ initials: "AR" }, { initials: "KM" }, { initials: "PN" }, { initials: "RD" }, { initials: "SI" }, { initials: "DP" }]} />
            <ul className="w-full divide-y divide-border rounded-card border border-border">
              {feed.map((f, i) => (
                <li key={i} className="flex items-center gap-3 p-3">
                  <Avatar className="size-8"><AvatarFallback className="text-xs">{f.initials}</AvatarFallback></Avatar>
                  <span className="flex-1 text-sm">{f.text}</span>
                  <span className="text-xs text-muted-foreground">{f.time}</span>
                </li>
              ))}
            </ul>
          </Block>
        </section>
      </div>
    </>
  );
}
