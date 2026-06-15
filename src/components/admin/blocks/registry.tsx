"use client";
import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { JsonEditor } from "./editors/json-editor";

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
  h2: { create: () => ({ type: "h2", text: "" }), Editor: JsonEditor },
  h3: { create: () => ({ type: "h3", text: "" }), Editor: JsonEditor },
  h4: { create: () => ({ type: "h4", text: "" }), Editor: JsonEditor },
  lead: { create: () => ({ type: "lead", text: "" }), Editor: JsonEditor },
  p: { create: () => ({ type: "p", text: "" }), Editor: JsonEditor },
  small: { create: () => ({ type: "small", text: "" }), Editor: JsonEditor },
  caption: { create: () => ({ type: "caption", text: "" }), Editor: JsonEditor },
  ul: { create: () => ({ type: "ul", items: [""] }), Editor: JsonEditor },
  ol: { create: () => ({ type: "ol", items: [""] }), Editor: JsonEditor },
  tasklist: { create: () => ({ type: "tasklist", items: [{ text: "", done: false }] }), Editor: JsonEditor },
  figure: { create: () => ({ type: "figure", image: { seed: "", alt: "" } }), Editor: JsonEditor },
  figures: { create: () => ({ type: "figures", images: [] }), Editor: JsonEditor },
  gallery: { create: () => ({ type: "gallery", images: [] }), Editor: JsonEditor },
  video: { create: () => ({ type: "video", id: "", title: "" }), Editor: JsonEditor },
  audio: { create: () => ({ type: "audio", title: "" }), Editor: JsonEditor },
  quote: { create: () => ({ type: "quote", text: "" }), Editor: JsonEditor },
  pullquote: { create: () => ({ type: "pullquote", text: "" }), Editor: JsonEditor },
  code: { create: () => ({ type: "code", code: "" }), Editor: JsonEditor },
  table: { create: () => ({ type: "table", columns: [], rows: [] }), Editor: JsonEditor },
  comparisonTable: { create: () => ({ type: "comparisonTable", columns: [], rows: [] }), Editor: JsonEditor },
  pricing: { create: () => ({ type: "pricing" }), Editor: JsonEditor },
  callout: { create: () => ({ type: "callout", text: "" }), Editor: JsonEditor },
  faq: { create: () => ({ type: "faq", items: [] }), Editor: JsonEditor },
  tabs: { create: () => ({ type: "tabs", items: [] }), Editor: JsonEditor },
  expand: { create: () => ({ type: "expand", summary: "", content: "" }), Editor: JsonEditor },
  socialEmbed: { create: () => ({ type: "socialEmbed", author: "", handle: "", text: "", date: "" }), Editor: JsonEditor },
  map: { create: () => ({ type: "map", query: "", label: "" }), Editor: JsonEditor },
  statCards: { create: () => ({ type: "statCards", stats: [] }), Editor: JsonEditor },
  metricsGrid: { create: () => ({ type: "metricsGrid", metrics: [] }), Editor: JsonEditor },
  progress: { create: () => ({ type: "progress", label: "", value: 0 }), Editor: JsonEditor },
  comparisonCards: { create: () => ({ type: "comparisonCards", cards: [] }), Editor: JsonEditor },
  divider: { create: () => ({ type: "divider" }), Editor: JsonEditor },
  spacer: { create: () => ({ type: "spacer", size: "md" }), Editor: JsonEditor },
  tags: { create: () => ({ type: "tags", items: [] }), Editor: JsonEditor },
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
