"use client";
import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { NumberField } from "../fields/number-field";
import { RepeaterField } from "../fields/repeater-field";

/* ------------------------------------------------------------------ */
/* statCards                                                            */
/* ------------------------------------------------------------------ */

type StatCardsBlock = Extract<ContentBlock, { type: "statCards" }>;
type Stat = StatCardsBlock["stats"][number];

export function StatCardsEditor({ block, onChange }: BlockEditorProps<StatCardsBlock>) {
  return (
    <RepeaterField<Stat>
      label="Stats"
      items={block.stats}
      onChange={(stats) => onChange({ ...block, stats })}
      create={() => ({ value: "", label: "" })}
      renderRow={(stat, onStatChange) => (
        <div className="grid gap-2">
          <TextField
            label="Value"
            value={stat.value}
            onChange={(value) => onStatChange({ ...stat, value })}
          />
          <TextField
            label="Label"
            value={stat.label}
            onChange={(label) => onStatChange({ ...stat, label })}
          />
          <TextField
            label="Sub (optional)"
            value={stat.sub ?? ""}
            onChange={(sub) => onStatChange({ ...stat, sub: sub || undefined })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* metricsGrid                                                          */
/* ------------------------------------------------------------------ */

type MetricsGridBlock = Extract<ContentBlock, { type: "metricsGrid" }>;
type Metric = MetricsGridBlock["metrics"][number];

export function MetricsGridEditor({ block, onChange }: BlockEditorProps<MetricsGridBlock>) {
  return (
    <RepeaterField<Metric>
      label="Metrics"
      items={block.metrics}
      onChange={(metrics) => onChange({ ...block, metrics })}
      create={() => ({ value: 0, label: "" })}
      renderRow={(metric, onMetricChange) => (
        <div className="grid gap-2">
          <NumberField
            label="Value"
            value={metric.value}
            onChange={(value) => onMetricChange({ ...metric, value })}
          />
          <TextField
            label="Label"
            value={metric.label}
            onChange={(label) => onMetricChange({ ...metric, label })}
          />
          <TextField
            label="Prefix (optional)"
            value={metric.prefix ?? ""}
            onChange={(prefix) => onMetricChange({ ...metric, prefix: prefix || undefined })}
          />
          <TextField
            label="Suffix (optional)"
            value={metric.suffix ?? ""}
            onChange={(suffix) => onMetricChange({ ...metric, suffix: suffix || undefined })}
          />
          <NumberField
            label="Decimals (optional)"
            value={metric.decimals ?? 0}
            onChange={(decimals) => onMetricChange({ ...metric, decimals: decimals || undefined })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* progress                                                             */
/* ------------------------------------------------------------------ */

type ProgressBlock = Extract<ContentBlock, { type: "progress" }>;

export function ProgressEditor({ block, onChange }: BlockEditorProps<ProgressBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Label"
        value={block.label}
        onChange={(label) => onChange({ ...block, label })}
      />
      <NumberField
        label="Value"
        value={block.value}
        onChange={(value) => onChange({ ...block, value })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* comparisonCards                                                      */
/* ------------------------------------------------------------------ */

type ComparisonCardsBlock = Extract<ContentBlock, { type: "comparisonCards" }>;
type ComparisonCard = ComparisonCardsBlock["cards"][number];
type ComparisonCardRow = ComparisonCard["rows"][number];

export function ComparisonCardsEditor({ block, onChange }: BlockEditorProps<ComparisonCardsBlock>) {
  return (
    <RepeaterField<ComparisonCard>
      label="Cards"
      items={block.cards}
      onChange={(cards) => onChange({ ...block, cards })}
      create={() => ({ title: "", rows: [] })}
      renderRow={(card, onCardChange) => (
        <div className="grid gap-2">
          <TextField
            label="Title"
            value={card.title}
            onChange={(title) => onCardChange({ ...card, title })}
          />
          <TextField
            label="Subtitle (optional)"
            value={card.subtitle ?? ""}
            onChange={(subtitle) => onCardChange({ ...card, subtitle: subtitle || undefined })}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={card.highlight ?? false}
              onChange={(e) => onCardChange({ ...card, highlight: e.target.checked || undefined })}
            />
            Highlight
          </label>
          <RepeaterField<ComparisonCardRow>
            label="Rows"
            items={card.rows}
            onChange={(rows) => onCardChange({ ...card, rows })}
            create={() => ({ label: "", value: "" })}
            renderRow={(row, onRowChange) => (
              <div className="grid gap-2">
                <TextField
                  label="Label"
                  value={row.label}
                  onChange={(label) => onRowChange({ ...row, label })}
                />
                <TextField
                  label="Value"
                  value={row.value}
                  onChange={(value) => onRowChange({ ...row, value })}
                />
              </div>
            )}
          />
        </div>
      )}
    />
  );
}
