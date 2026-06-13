import {
  BookOpen,
  Braces,
  Calculator,
  CalendarCheck,
  Code2,
  Compass,
  FileText,
  Gauge,
  LayoutGrid,
  Link2,
  Mic,
  PenLine,
  Search,
  Sparkles,
  Target,
  Type,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const registry: Record<string, LucideIcon> = {
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
};

/** Render a lucide icon by its string name (used for CMS-style data). */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = registry[name] ?? Sparkles;
  return <Cmp className={cn("size-5", className)} aria-hidden />;
}
