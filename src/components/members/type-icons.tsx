import { createElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CheckSquare,
  Code,
  Download,
  FileText,
  GitBranch,
  LayoutGrid,
  MessageSquare,
  Play,
  Wrench,
} from "lucide-react";

export const TYPE_ICONS: Record<string, LucideIcon> = {
  article: FileText,
  prompt: MessageSquare,
  template: LayoutGrid,
  workflow: GitBranch,
  tool: Wrench,
  checklist: CheckSquare,
  "case-study": Briefcase,
  download: Download,
  video: Play,
  snippet: Code,
};

/** Icon for a resource type key (FileText fallback). */
export function TypeIcon({ type, className }: { type: string; className?: string }) {
  return createElement(TYPE_ICONS[type] ?? FileText, { className });
}
