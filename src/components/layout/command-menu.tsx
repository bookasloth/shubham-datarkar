"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  CalendarCheck,
  Copy,
  FileText,
  Home,
  Layers,
  Mail,
  MoonStar,
  Newspaper,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { site } from "@/lib/site";
import { useToast } from "@/components/ui/toast";
import { Kbd } from "@/components/ui/kbd";

export const OPEN_COMMAND_EVENT = "open-command-menu";

type Cmd = { label: string; href?: string; icon: React.ReactNode; keywords?: string };

const NAV: { group: string; items: Cmd[] }[] = [
  {
    group: "Go to",
    items: [
      { label: "Home", href: "/", icon: <Home /> },
      { label: "About", href: "/about", icon: <FileText />, keywords: "story bio" },
      { label: "Work / Projects", href: "/work", icon: <Layers /> },
      { label: "Case Studies", href: "/case-studies", icon: <Layers />, keywords: "results" },
      { label: "Services", href: "/services", icon: <Sparkles /> },
      { label: "Blog", href: "/blog", icon: <Newspaper />, keywords: "articles writing" },
      { label: "Newsletter", href: "/newsletter", icon: <Mail /> },
    ],
  },
  {
    group: "Build",
    items: [
      { label: "Products", href: "/products", icon: <Layers /> },
      { label: "Free Tools", href: "/tools", icon: <Wrench /> },
      { label: "AI Experiments", href: "/ai-experiments", icon: <Sparkles /> },
      { label: "Components", href: "/components", icon: <Layers />, keywords: "design system ui" },
    ],
  },
  {
    group: "More",
    items: [
      { label: "Now", href: "/now", icon: <FileText /> },
      { label: "Uses", href: "/uses", icon: <Wrench /> },
      { label: "Roadmap", href: "/roadmap", icon: <FileText /> },
      { label: "Changelog", href: "/changelog", icon: <FileText /> },
      { label: "FAQ", href: "/faq", icon: <FileText /> },
      { label: "Contact", href: "/contact", icon: <Mail /> },
    ],
  },
];

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  const run = React.useCallback((fn: () => void) => {
    setOpen(false);
    // Defer so the dialog close animation doesn't fight navigation.
    requestAnimationFrame(fn);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      overlayClassName="fixed inset-0 z-[90] bg-foreground/40 backdrop-blur-sm overlay-anim"
      contentClassName="pop-anim fixed left-1/2 top-[12vh] z-[91] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card border border-border bg-popover text-popover-foreground shadow-lg"
    >
      {/* Radix Dialog (rendered by cmdk) requires a Title for screen readers. */}
      <DialogPrimitive.Title className="sr-only">Command menu</DialogPrimitive.Title>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="size-4 text-muted-foreground" />
        <Command.Input
          placeholder="Search pages, actions…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
          No results found.
        </Command.Empty>

        {NAV.map((section) => (
          <Command.Group
            key={section.group}
            heading={section.group}
            className="px-1 pb-1 pt-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
          >
            {section.items.map((item) => (
              <Command.Item
                key={item.label}
                value={`${item.label} ${item.keywords ?? ""}`}
                onSelect={() => run(() => router.push(item.href!))}
                className="flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-sm text-foreground transition-ui data-[selected=true]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <ArrowRight className="size-3.5 opacity-0 data-[selected=true]:opacity-100" />
              </Command.Item>
            ))}
          </Command.Group>
        ))}

        <Command.Group
          heading="Actions"
          className="px-1 pb-1 pt-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
        >
          <Command.Item
            value="book a call schedule meeting"
            onSelect={() => run(() => window.open(site.bookingUrl, "_blank", "noopener"))}
            className="flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-sm transition-ui data-[selected=true]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
          >
            <CalendarCheck />
            <span className="flex-1">Book a call</span>
          </Command.Item>
          <Command.Item
            value="copy email contact"
            onSelect={() =>
              run(() => {
                navigator.clipboard?.writeText(site.email);
                toast({ title: "Email copied", description: site.email, variant: "success" });
              })
            }
            className="flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-sm transition-ui data-[selected=true]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
          >
            <Copy />
            <span className="flex-1">Copy email</span>
          </Command.Item>
          <Command.Item
            value="toggle theme dark light mode"
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
            className="flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-sm transition-ui data-[selected=true]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
          >
            <MoonStar />
            <span className="flex-1">Toggle theme</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
