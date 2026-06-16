import type { LucideIcon } from "lucide-react";
import {
  Pilcrow, Heading2, Heading3, Heading4, Type, Baseline, Captions,
  List, ListOrdered, ListChecks,
  Image, Images, GalleryHorizontal, Video, AudioLines,
  Quote, TextQuote, Code, Table, Columns3, Tag,
  Megaphone, MessageCircleQuestion, PanelTop, ChevronsUpDown,
  AtSign, Map, BarChart3, Grid3x3, Activity, Columns2,
  Minus, MoveVertical, Tags, MousePointerClick, Mail, Download, RectangleHorizontal,
  Lightbulb, FileText, Scale, ListTodo, Clock, BookMarked, Asterisk,
  PenLine, BadgeCheck, Link2, Library, Zap,
} from "lucide-react";
import type { ContentBlock } from "@/lib/data/types";

export type BlockType = ContentBlock["type"];
export type BlockGroup =
  | "Typography" | "Lists" | "Media" | "Quotes" | "Code" | "Tables"
  | "Callouts" | "Interactive" | "Embeds" | "Data & statistics"
  | "Utility" | "Conversion" | "Knowledge" | "Advanced";

/**
 * Every block type, with a lucide icon for the visual palette and a `rank`
 * for ordering it (lower = more popular for a blog post = shown first).
 * The palette sorts by `rank`; `group` is retained for grouping elsewhere.
 */
export const BLOCK_TYPES: {
  type: BlockType;
  group: BlockGroup;
  label: string;
  icon: LucideIcon;
  rank: number;
}[] = [
  // Most popular for a blog post first.
  { type: "p", group: "Typography", label: "Paragraph", icon: Pilcrow, rank: 1 },
  { type: "h2", group: "Typography", label: "Heading 2", icon: Heading2, rank: 2 },
  { type: "h3", group: "Typography", label: "Heading 3", icon: Heading3, rank: 3 },
  { type: "figure", group: "Media", label: "Figure", icon: Image, rank: 4 },
  { type: "ul", group: "Lists", label: "Bullet list", icon: List, rank: 5 },
  { type: "ol", group: "Lists", label: "Numbered list", icon: ListOrdered, rank: 6 },
  { type: "quote", group: "Quotes", label: "Quote", icon: Quote, rank: 7 },
  { type: "callout", group: "Callouts", label: "Callout", icon: Megaphone, rank: 8 },
  { type: "code", group: "Code", label: "Code block", icon: Code, rank: 9 },
  { type: "lead", group: "Typography", label: "Lead paragraph", icon: Type, rank: 10 },
  { type: "takeaways", group: "Knowledge", label: "Key takeaways", icon: Lightbulb, rank: 11 },
  { type: "pullquote", group: "Quotes", label: "Pull quote", icon: TextQuote, rank: 12 },
  { type: "divider", group: "Utility", label: "Divider", icon: Minus, rank: 13 },
  { type: "h4", group: "Typography", label: "Heading 4", icon: Heading4, rank: 14 },
  { type: "tasklist", group: "Lists", label: "Task list", icon: ListChecks, rank: 15 },
  { type: "figures", group: "Media", label: "Side-by-side images", icon: Images, rank: 16 },
  { type: "gallery", group: "Media", label: "Gallery", icon: GalleryHorizontal, rank: 17 },
  { type: "video", group: "Media", label: "Video embed", icon: Video, rank: 18 },
  { type: "table", group: "Tables", label: "Table", icon: Table, rank: 19 },
  { type: "faq", group: "Interactive", label: "FAQ", icon: MessageCircleQuestion, rank: 20 },
  { type: "cta", group: "Conversion", label: "CTA banner", icon: MousePointerClick, rank: 21 },
  { type: "newsletter", group: "Conversion", label: "Newsletter", icon: Mail, rank: 22 },
  { type: "steps", group: "Knowledge", label: "Step guide", icon: ListTodo, rank: 23 },
  { type: "summary", group: "Knowledge", label: "Summary box", icon: FileText, rank: 24 },
  { type: "prosCons", group: "Knowledge", label: "Pros & cons", icon: Scale, rank: 25 },
  { type: "tabs", group: "Interactive", label: "Tabs", icon: PanelTop, rank: 26 },
  { type: "expand", group: "Interactive", label: "Expandable", icon: ChevronsUpDown, rank: 27 },
  { type: "tags", group: "Utility", label: "Tags", icon: Tags, rank: 28 },
  { type: "spacer", group: "Utility", label: "Spacer", icon: MoveVertical, rank: 29 },
  { type: "small", group: "Typography", label: "Small text", icon: Baseline, rank: 30 },
  { type: "caption", group: "Typography", label: "Caption", icon: Captions, rank: 31 },
  { type: "statCards", group: "Data & statistics", label: "Stat cards", icon: BarChart3, rank: 32 },
  { type: "metricsGrid", group: "Data & statistics", label: "Metrics grid", icon: Grid3x3, rank: 33 },
  { type: "progress", group: "Data & statistics", label: "Progress bar", icon: Activity, rank: 34 },
  { type: "comparisonCards", group: "Data & statistics", label: "Comparison cards", icon: Columns2, rank: 35 },
  { type: "timeline", group: "Knowledge", label: "Timeline", icon: Clock, rank: 36 },
  { type: "download", group: "Conversion", label: "Download card", icon: Download, rank: 37 },
  { type: "buttonGroup", group: "Conversion", label: "Button group", icon: RectangleHorizontal, rank: 38 },
  { type: "expertInsight", group: "Advanced", label: "Expert insight", icon: BadgeCheck, rank: 39 },
  { type: "authorNote", group: "Advanced", label: "Author note", icon: PenLine, rank: 40 },
  { type: "quickFacts", group: "Advanced", label: "Quick facts", icon: Zap, rank: 41 },
  { type: "relatedCard", group: "Advanced", label: "Related card", icon: Link2, rank: 42 },
  { type: "resourceList", group: "Advanced", label: "Resource list", icon: Library, rank: 43 },
  { type: "comparisonTable", group: "Tables", label: "Comparison table", icon: Columns3, rank: 44 },
  { type: "pricing", group: "Tables", label: "Pricing table", icon: Tag, rank: 45 },
  { type: "socialEmbed", group: "Embeds", label: "Social embed", icon: AtSign, rank: 46 },
  { type: "map", group: "Embeds", label: "Map", icon: Map, rank: 47 },
  { type: "audio", group: "Media", label: "Audio player", icon: AudioLines, rank: 48 },
  { type: "references", group: "Knowledge", label: "References", icon: BookMarked, rank: 49 },
  { type: "footnotes", group: "Knowledge", label: "Footnotes", icon: Asterisk, rank: 50 },
];
