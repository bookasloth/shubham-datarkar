"use client";
import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { JsonEditor } from "./editors/json-editor";
import { H2Editor, H3Editor, H4Editor, LeadEditor, PEditor, SmallEditor, CaptionEditor } from "./editors/typography";
import { QuoteEditor, PullquoteEditor } from "./editors/quotes";
import { CodeEditor } from "./editors/code";
import { DividerEditor, SpacerEditor, TagsEditor } from "./editors/utility";
import { UlEditor, OlEditor, TasklistEditor } from "./editors/lists";
import { TableEditor, ComparisonTableEditor, PricingEditor } from "./editors/tables";
import { StatCardsEditor, MetricsGridEditor, ProgressEditor, ComparisonCardsEditor } from "./editors/data";

export type BlockEditorProps<T extends ContentBlock = ContentBlock> = {
  block: T;
  onChange: (b: T) => void;
};

type Entry<T extends ContentBlock> = {
  create: () => T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: (props: BlockEditorProps<any>) => React.ReactNode;
};

type RegistryShape = { [K in ContentBlock["type"]]: Entry<Extract<ContentBlock, { type: K }>> };

// Every block type filled in below. `satisfies RegistryShape` => missing key is a compile error.
export const registry = {
  h2: { create: () => ({ type: "h2", text: "" }), Editor: H2Editor },
  h3: { create: () => ({ type: "h3", text: "" }), Editor: H3Editor },
  h4: { create: () => ({ type: "h4", text: "" }), Editor: H4Editor },
  lead: { create: () => ({ type: "lead", text: "" }), Editor: LeadEditor },
  p: { create: () => ({ type: "p", text: "" }), Editor: PEditor },
  small: { create: () => ({ type: "small", text: "" }), Editor: SmallEditor },
  caption: { create: () => ({ type: "caption", text: "" }), Editor: CaptionEditor },
  ul: { create: () => ({ type: "ul", items: [""] }), Editor: UlEditor },
  ol: { create: () => ({ type: "ol", items: [""] }), Editor: OlEditor },
  tasklist: { create: () => ({ type: "tasklist", items: [{ text: "", done: false }] }), Editor: TasklistEditor },
  figure: { create: () => ({ type: "figure", image: { seed: "", alt: "" } }), Editor: JsonEditor },
  figures: { create: () => ({ type: "figures", images: [] }), Editor: JsonEditor },
  gallery: { create: () => ({ type: "gallery", images: [] }), Editor: JsonEditor },
  video: { create: () => ({ type: "video", id: "", title: "" }), Editor: JsonEditor },
  audio: { create: () => ({ type: "audio", title: "" }), Editor: JsonEditor },
  quote: { create: () => ({ type: "quote", text: "" }), Editor: QuoteEditor },
  pullquote: { create: () => ({ type: "pullquote", text: "" }), Editor: PullquoteEditor },
  code: { create: () => ({ type: "code", code: "" }), Editor: CodeEditor },
  table: { create: () => ({ type: "table", columns: [], rows: [] }), Editor: TableEditor },
  comparisonTable: { create: () => ({ type: "comparisonTable", columns: [], rows: [] }), Editor: ComparisonTableEditor },
  pricing: { create: () => ({ type: "pricing" }), Editor: PricingEditor },
  callout: { create: () => ({ type: "callout", text: "" }), Editor: JsonEditor },
  faq: { create: () => ({ type: "faq", items: [] }), Editor: JsonEditor },
  tabs: { create: () => ({ type: "tabs", items: [] }), Editor: JsonEditor },
  expand: { create: () => ({ type: "expand", summary: "", content: "" }), Editor: JsonEditor },
  socialEmbed: { create: () => ({ type: "socialEmbed", author: "", handle: "", text: "", date: "" }), Editor: JsonEditor },
  map: { create: () => ({ type: "map", query: "", label: "" }), Editor: JsonEditor },
  statCards: { create: () => ({ type: "statCards", stats: [] }), Editor: StatCardsEditor },
  metricsGrid: { create: () => ({ type: "metricsGrid", metrics: [] }), Editor: MetricsGridEditor },
  progress: { create: () => ({ type: "progress", label: "", value: 0 }), Editor: ProgressEditor },
  comparisonCards: { create: () => ({ type: "comparisonCards", cards: [] }), Editor: ComparisonCardsEditor },
  divider: { create: () => ({ type: "divider" }), Editor: DividerEditor },
  spacer: { create: () => ({ type: "spacer", size: "md" }), Editor: SpacerEditor },
  tags: { create: () => ({ type: "tags", items: [] }), Editor: TagsEditor },
  cta: { create: () => ({ type: "cta", title: "", text: "", button: "", href: "" }), Editor: JsonEditor },
  newsletter: { create: () => ({ type: "newsletter", title: "", text: "" }), Editor: JsonEditor },
  download: { create: () => ({ type: "download", title: "", description: "", meta: "" }), Editor: JsonEditor },
  buttonGroup: { create: () => ({ type: "buttonGroup", buttons: [] }), Editor: JsonEditor },
  takeaways: { create: () => ({ type: "takeaways", items: [""] }), Editor: JsonEditor },
  summary: { create: () => ({ type: "summary", text: "" }), Editor: JsonEditor },
  prosCons: { create: () => ({ type: "prosCons", pros: [], cons: [] }), Editor: JsonEditor },
  steps: { create: () => ({ type: "steps", items: [] }), Editor: JsonEditor },
  timeline: { create: () => ({ type: "timeline", items: [] }), Editor: JsonEditor },
  references: { create: () => ({ type: "references", items: [] }), Editor: JsonEditor },
  footnotes: { create: () => ({ type: "footnotes", items: [] }), Editor: JsonEditor },
  authorNote: { create: () => ({ type: "authorNote", text: "" }), Editor: JsonEditor },
  expertInsight: { create: () => ({ type: "expertInsight", name: "", role: "", quote: "" }), Editor: JsonEditor },
  relatedCard: { create: () => ({ type: "relatedCard", slug: "" }), Editor: JsonEditor },
  resourceList: { create: () => ({ type: "resourceList", items: [] }), Editor: JsonEditor },
  quickFacts: { create: () => ({ type: "quickFacts", facts: [] }), Editor: JsonEditor },
} satisfies RegistryShape;
