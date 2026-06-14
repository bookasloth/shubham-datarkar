import {
  BookOpen,
  Braces,
  Calculator,
  CalendarCheck,
  Clapperboard,
  Clock,
  Code2,
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
  // Platform / product icons
  Megaphone,
  Clock,
  Newspaper,
  CreditCard,
  Clapperboard,
  Users,
};

/** Render a lucide icon by its string name (used for CMS-style data). */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = registry[name] ?? Sparkles;
  return <Cmp className={cn("size-5", className)} aria-hidden />;
}
