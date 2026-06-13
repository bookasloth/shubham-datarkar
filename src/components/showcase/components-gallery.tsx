"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Download,
  Inbox,
  MoreHorizontal,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Marquee } from "@/components/sections/marquee";
import { StatGrid } from "@/components/sections/stat-grid";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { stats } from "@/lib/data/site-content";
import { testimonials } from "@/lib/data/testimonials";

const groups = [
  { id: "actions", label: "Actions" },
  { id: "forms", label: "Forms" },
  { id: "data-display", label: "Data display" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "navigation", label: "Navigation" },
  { id: "blocks", label: "Blocks" },
];

function Block({
  n,
  title,
  desc,
  children,
  className,
}: {
  n: number;
  title: string;
  desc: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="scroll-mt-24">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-xs font-bold tabular-nums text-muted-foreground/60">
          {String(n).padStart(2, "0")}
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className={cn("flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6", className)}>
        {children}
      </div>
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

export function ComponentsGallery() {
  const { toast } = useToast();

  return (
    <TooltipProvider delayDuration={150}>
      {/* In-page anchor nav */}
      <nav aria-label="Component categories" className="mb-12 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium transition-ui hover:bg-accent"
          >
            {g.label}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-16">
        {/* ACTIONS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="actions" label="Actions" />

          <Block n={1} title="Button variants" desc="Six variants, one shared interaction language.">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </Block>

          <Block n={2} title="Button sizes" desc="sm, default, lg, and icon.">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Star">
              <Star />
            </Button>
            <Button size="icon-sm" variant="outline" aria-label="More">
              <MoreHorizontal />
            </Button>
          </Block>

          <Block n={3} title="Button states" desc="Loading, disabled, and with icons.">
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button>
              Continue <ArrowRight />
            </Button>
            <Button variant="outline">
              <Download /> Export
            </Button>
          </Block>

          <Block n={4} title="Copy button" desc="Inline copy-to-clipboard with confirmation.">
            <CopyButton value="hello@shubhamdatarkar.com" label="Copy email" />
          </Block>

          <Block n={5} title="Badges" desc="Status and label chips.">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </Block>
        </section>

        {/* FORMS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="forms" label="Forms" />

          <Block n={6} title="Text input" desc="Default, with value, and disabled.">
            <div className="w-full max-w-xs">
              <Input placeholder="you@company.com" />
            </div>
            <div className="w-full max-w-xs">
              <Input defaultValue="shubham" />
            </div>
            <div className="w-full max-w-xs">
              <Input placeholder="Disabled" disabled />
            </div>
          </Block>

          <Block n={7} title="Input — error" desc="Invalid state with aria-invalid.">
            <div className="w-full max-w-xs">
              <Input defaultValue="not-an-email" aria-invalid />
              <p className="mt-1.5 text-xs text-danger">Enter a valid email address.</p>
            </div>
          </Block>

          <Block n={8} title="Textarea" desc="Multi-line input.">
            <div className="w-full max-w-md">
              <Textarea placeholder="A couple of sentences…" />
            </div>
          </Block>

          <Block n={9} title="Label + field" desc="Accessible label association.">
            <div className="grid w-full max-w-xs gap-1.5">
              <Label htmlFor="demo-field">Full name</Label>
              <Input id="demo-field" placeholder="Jane Founder" />
            </div>
          </Block>

          <Block n={10} title="Select" desc="Accessible dropdown select.">
            <div className="w-full max-w-xs">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seo">SEO</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="ai">AI Automation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Block>

          <Block n={11} title="Checkbox" desc="With label.">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Subscribe to the newsletter
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox /> Unchecked option
            </label>
          </Block>

          <Block n={12} title="Switch" desc="On/off toggle.">
            <div className="flex items-center gap-2">
              <Switch defaultChecked id="sw1" />
              <Label htmlFor="sw1">Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sw2" />
              <Label htmlFor="sw2">Disabled</Label>
            </div>
          </Block>
        </section>

        {/* DATA DISPLAY */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="data-display" label="Data display" />

          <Block n={13} title="Card" desc="The base surface, static and interactive.">
            <Card className="w-full max-w-xs">
              <CardHeader>
                <CardTitle>Static card</CardTitle>
                <CardDescription>A simple content surface.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Body content goes here.</CardContent>
              <CardFooter>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>
            <Card interactive className="w-full max-w-xs p-6">
              <p className="text-sm font-medium">Interactive card</p>
              <p className="mt-1 text-sm text-muted-foreground">Lifts on hover.</p>
            </Card>
          </Block>

          <Block n={14} title="Avatar" desc="Fallback initials, and a stacked group.">
            <Avatar>
              <AvatarFallback>SD</AvatarFallback>
            </Avatar>
            <div className="flex -space-x-2">
              {["AR", "KM", "PN", "RD"].map((i) => (
                <Avatar key={i} className="ring-2 ring-background">
                  <AvatarFallback>{i}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </Block>

          <Block n={15} title="Table" desc="Structured rows with hover.">
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Organic / mo</TableCell>
                    <TableCell className="text-muted-foreground">120</TableCell>
                    <TableCell>50,400</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CAC</TableCell>
                    <TableCell className="text-muted-foreground">₹9,800</TableCell>
                    <TableCell>₹3,100</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Block>

          <Block n={16} title="Progress" desc="A simple determinate bar.">
            <div className="w-full max-w-sm">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Profile completion</span>
                <span>72%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground" style={{ width: "72%" }} />
              </div>
            </div>
          </Block>

          <Block n={17} title="Kbd & Separator" desc="Keyboard hints and dividers.">
            <span className="flex items-center gap-1 text-sm">
              Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
            </span>
            <Separator orientation="vertical" className="h-6" />
            <span className="flex items-center gap-1 text-sm">
              <Kbd>Esc</Kbd> to close
            </span>
          </Block>

          <Block n={18} title="Spinner" desc="The one loading indicator.">
            <Spinner />
            <Spinner className="size-6 text-muted-foreground" />
            <Spinner className="size-8" />
          </Block>

          <Block n={19} title="Tag pills" desc="Compact metadata tags.">
            {["Next.js", "TypeScript", "Tailwind", "Framer Motion"].map((t) => (
              <span key={t} className="rounded-btn bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </Block>
        </section>

        {/* FEEDBACK */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="feedback" label="Feedback" />

          <Block n={20} title="Alerts" desc="Five intents, used sparingly." className="flex-col items-stretch">
            <Alert>
              <Sparkles />
              <div>
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>A neutral, default alert for general information.</AlertDescription>
              </div>
            </Alert>
            <Alert variant="success">
              <Check />
              <div>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>Your changes were saved successfully.</AlertDescription>
              </div>
            </Alert>
            <Alert variant="accent">
              <div>
                <AlertDescription className="text-foreground">An accent callout for emphasis in long-form content.</AlertDescription>
              </div>
            </Alert>
          </Block>

          <Block n={21} title="Toasts" desc="Transient notifications, bottom-right.">
            <Button variant="outline" onClick={() => toast({ title: "Default toast", description: "Something happened." })}>
              Default
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Saved", description: "All set.", variant: "success" })}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Heads up", description: "Double-check this.", variant: "warning" })}>
              Warning
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Something broke", description: "Please retry.", variant: "danger" })}>
              Danger
            </Button>
          </Block>

          <Block n={22} title="Skeleton" desc="Loading placeholders." className="flex-col items-stretch">
            <div className="flex w-full items-center gap-4">
              <Skeleton className="size-12 rounded-btn" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </Block>

          <Block n={23} title="Empty state" desc="When there's nothing to show." className="flex-col items-stretch">
            <EmptyState
              icon={<Inbox />}
              title="No messages yet"
              description="When someone reaches out, it'll show up here."
              action={<Button size="sm">Compose</Button>}
            />
          </Block>
        </section>

        {/* OVERLAYS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="overlays" label="Overlays" />

          <Block n={24} title="Dialog" desc="Accessible modal with focus trap.">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a project</DialogTitle>
                  <DialogDescription>Tell me a little about what you&apos;re working on.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input placeholder="Your name" />
                  <Textarea placeholder="What are you building?" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Send</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Block>

          <Block n={25} title="Dropdown menu" desc="Contextual actions.">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Options <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Star /> Favourite
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download /> Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Block>

          <Block n={26} title="Popover" desc="Lightweight floating panel.">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm font-medium">Quick note</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Popovers are great for secondary actions and contextual help.
                </p>
              </PopoverContent>
            </Popover>
          </Block>

          <Block n={27} title="Tooltip" desc="On hover and focus.">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Info">
                  <Sparkles />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Built with one shared motion language</TooltipContent>
            </Tooltip>
          </Block>

          <Block n={28} title="Theme toggle" desc="Light / dark, instantly.">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Try it — the whole page responds.</span>
          </Block>
        </section>

        {/* NAVIGATION */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="navigation" label="Navigation" />

          <Block n={29} title="Tabs" desc="Switch between panels." className="flex-col items-stretch">
            <Tabs defaultValue="a">
              <TabsList>
                <TabsTrigger value="a">Overview</TabsTrigger>
                <TabsTrigger value="b">Details</TabsTrigger>
                <TabsTrigger value="c">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="a" className="text-sm text-muted-foreground">The overview panel content.</TabsContent>
              <TabsContent value="b" className="text-sm text-muted-foreground">The details panel content.</TabsContent>
              <TabsContent value="c" className="text-sm text-muted-foreground">The activity panel content.</TabsContent>
            </Tabs>
          </Block>

          <Block n={30} title="Accordion" desc="Expandable sections." className="flex-col items-stretch">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="1">
                <AccordionTrigger>What do you work on?</AccordionTrigger>
                <AccordionContent>Compounding growth systems and SaaS products.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger>How do engagements work?</AccordionTrigger>
                <AccordionContent>Audit, design, build, then hand over a system that compounds.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Block>

          <Block n={31} title="Breadcrumb" desc="Hierarchical location.">
            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Article" }]} />
          </Block>

          <Block n={32} title="Pagination" desc="Paged navigation with ellipses.">
            <Pagination current={3} total={12} hrefFor={() => "#"} />
          </Block>

          <Block n={33} title="Command hint" desc="The search trigger pill.">
            <button className="flex h-9 items-center gap-2 rounded-input border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
              <Search className="size-4" /> Search <Kbd className="ml-2">⌘K</Kbd>
            </button>
          </Block>
        </section>

        {/* BLOCKS */}
        <section className="flex flex-col gap-10">
          <GroupHeading id="blocks" label="Composed blocks" />

          <Block n={34} title="Stat grid" desc="Headline metrics." className="flex-col items-stretch">
            <StatGrid stats={stats} />
          </Block>

          <Block n={35} title="Metric highlight" desc="A single hero number.">
            <div>
              <div className="font-display text-5xl font-extrabold tracking-tight">3.1x</div>
              <div className="mt-1 text-sm text-muted-foreground">Blended ROAS at scale</div>
            </div>
          </Block>

          <Block n={36} title="Pricing card" desc="A simple plan surface.">
            <Card className="w-full max-w-xs p-6">
              <Badge variant="muted">Pro</Badge>
              <div className="mt-4">
                <span className="font-display text-3xl font-extrabold tracking-tight">₹1.5L</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {["SEO architecture", "Content system", "Monthly reporting"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-muted-foreground" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-5 w-full">Get started</Button>
            </Card>
          </Block>

          <Block n={37} title="Feature grid" desc="Icon-led capability tiles." className="flex-col items-stretch">
            <div className="grid w-full gap-4 sm:grid-cols-3">
              {[
                { t: "Owned", d: "Assets you control." },
                { t: "Measurable", d: "One north-star metric." },
                { t: "Compounding", d: "Better every cycle." },
              ].map((f) => (
                <div key={f.t} className="rounded-card border border-border p-5">
                  <div className="flex size-9 items-center justify-center rounded-btn bg-muted">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="mt-3 font-medium">{f.t}</p>
                  <p className="text-sm text-muted-foreground">{f.d}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block n={38} title="Testimonial card" desc="Social proof surface." className="flex-col items-stretch">
            <div className="max-w-sm">
              <TestimonialCard testimonial={testimonials[0]} />
            </div>
          </Block>

          <Block n={39} title="Marquee" desc="Infinite, pause-on-hover ticker." className="flex-col items-stretch">
            <Marquee duration={24}>
              {["Lumen", "Saanj", "Northwind", "Meridian", "Cobalt", "Harbor"].map((l) => (
                <span key={l} className="font-display text-base font-bold text-muted-foreground/70">
                  {l}
                </span>
              ))}
            </Marquee>
          </Block>

          <Block n={40} title="Timeline" desc="A vertical event list." className="flex-col items-stretch">
            <ol className="relative ml-1 border-l border-border">
              {[
                { y: "2021", t: "Founded the agency" },
                { y: "2024", t: "Started the SaaS studio" },
                { y: "2026", t: "Built the Digital HQ" },
              ].map((e) => (
                <li key={e.y} className="relative ml-5 pb-5 last:pb-0">
                  <span className="absolute -left-[27px] size-3 rounded-full border-2 border-background bg-foreground" />
                  <span className="font-display text-xs font-bold text-muted-foreground">{e.y}</span>
                  <p className="text-sm">{e.t}</p>
                </li>
              ))}
            </ol>
          </Block>

          <Block n={41} title="Mini CTA band" desc="A compact conversion surface." className="flex-col items-stretch">
            <div className="flex w-full flex-col items-center gap-4 rounded-card bg-foreground p-8 text-center text-background sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-display text-lg font-bold">Ready to build?</p>
                <p className="text-sm text-background/70">Let&apos;s talk through your problem.</p>
              </div>
              <Button className="bg-background text-foreground hover:bg-background/90">Book a call</Button>
            </div>
          </Block>
        </section>
      </div>
    </TooltipProvider>
  );
}
