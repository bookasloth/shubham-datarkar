import {
  Asterisk,
  BookOpen,
  Braces,
  Bug,
  Calculator,
  CalendarCheck,
  Clapperboard,
  Clock,
  Code2,
  Coffee,
  Compass,
  CreditCard,
  FileText,
  Gauge,
  LayoutGrid,
  Link2,
  Megaphone,
  Mic,
  Newspaper,
  PenLine,
  Search,
  Sparkles,
  Target,
  Type,
  Users,
  Workflow,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Custom necktie glyph — lucide has no tie. Matches lucide's 24-grid stroke style. */
function Tie({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      <path d="M9 3h6l-1 4h-4z" />
      <path d="M14 7l2.5 7L12 21l-4.5-7L10 7" />
    </svg>
  );
}

type IconCmp = React.ComponentType<{ className?: string }>;

const registry: Record<string, IconCmp> = {
  Search,
  Target,
  PenLine,
  Sparkles,
  Compass,
  Mic,
  CalendarCheck,
  LayoutGrid,
  Gauge,
  Workflow,
  Calculator,
  FileText,
  Type,
  Braces,
  Link2,
  BookOpen,
  Code2,
  // Platform / product icons
  Megaphone,
  Clock,
  Newspaper,
  CreditCard,
  Clapperboard,
  Users,
  Asterisk,
  Bug,
  Coffee,
  Tie,
};

/** Render a lucide icon by its string name (used for CMS-style data). */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = registry[name] ?? Sparkles;
  return <Cmp className={cn("size-5", className)} aria-hidden />;
}
