# Editorial Content Showcase

The post **"SEO Is Infrastructure, Not Traffic"** (`/blog/seo/seo-is-infrastructure-not-traffic`)
is a kitchen-sink demonstration of every content block the article CMS supports. It reads as a
real editorial piece — each component appears at a natural point in the argument, not as a gallery.

The system is **data-driven**: an article is a `ContentBlock[]` (see `src/lib/data/types.ts`),
exactly what a headless CMS (Sanity) would return. `ArticleBody`
(`src/components/content/article-body.tsx`) maps each block to a component. To add a block to any
post, append an object to its `body` array — no JSX required.

The other 9 posts still use the shared `body()` helper and are **unchanged**. All shapes stay
backward-compatible (`p.text`, list items, and `callout` accept their old string forms), so there
are **zero breaking changes** — verified by a full production build prerendering every post.

---

## Reused components (no changes)

Pulled straight from the existing design system:

| Component | Path | Used for |
|---|---|---|
| `Alert` | `ui/alert.tsx` | All 6 callouts (note/tip/info/success/warning/error) |
| `Accordion` | `ui/accordion.tsx` | FAQ |
| `Tabs` | `ui/tabs.tsx` | Tabbed content |
| `Collapsible` | `ui/collapsible.tsx` | Expand / collapse section |
| `Tooltip` | `ui/tooltip.tsx` | Inline tooltip |
| `Popover` | `ui/popover.tsx` | Inline popover |
| `Table` | `ui/table.tsx` | Standard, responsive & comparison tables |
| `PricingTable` | `ui/pricing-table.tsx` | Pricing block |
| `Progress` | `ui/progress.tsx` | Progress bars |
| `StatCounter` | `ui/stat-counter.tsx` | Animated metrics grid |
| `Stepper` | `ui/stepper.tsx` | Step-by-step guide header |
| `Timeline` | `ui/timeline.tsx` | Timeline block |
| `Separator` | `ui/separator.tsx` | Divider |
| `Badge` | `ui/badge.tsx` | Tags / labels |
| `Kbd` | `ui/kbd.tsx` | Inline keyboard keys |
| `Carousel` | `ui/carousel.tsx` | Image gallery |
| `Button` | `ui/button.tsx` | CTAs, button groups |
| `Card` | `ui/card.tsx` | Stat / comparison / download surfaces |
| `Breadcrumb` | `ui/breadcrumb.tsx` | Page header (already present) |
| `NewsletterForm` | `sections/newsletter-form.tsx` | Newsletter signup |
| `PostCard` | `cards/post-card.tsx` | Related content card |

## Reused components (extended, backward-compatible)

| Component | Change |
|---|---|
| `CodeBlock` (`ui/code-block.tsx`) | Added dependency-free, **monochrome** syntax highlighting (comments/strings/keywords/numbers via weight + opacity). Filename header & copy button already existed. |
| `ArticleBody` (`content/article-body.tsx`) | Rewritten to render the full block union; wrapped in `TooltipProvider`. Old blocks render identically. |

## New components created

All match the existing monochrome tokens, radii, motion language, and are dark-mode + responsive.

| File | Components |
|---|---|
| `content/rich-text.tsx` | `RichText` inline renderer — bold, italic, underline, strikethrough, highlight, small, inline code, kbd, sub/sup, links, inline tooltip/popover, footnote refs |
| `content/editorial-media.tsx` | `MonoImage` (asset-free SVG placeholder), `Figure`, `SideBySide`, `Gallery`, `VideoEmbed` (YouTube), `MapEmbed` (OpenStreetMap), `SocialEmbed` |
| `content/editorial-blocks.tsx` | `Callout`, `PullQuote`, `TableBlock`, `ComparisonTable`, `StatCards`, `MetricsGrid`, `ProgressBlock`, `ComparisonCards`, `CtaBanner`, `DownloadCard`, `ButtonGroup`, `Tags`, `Spacer`, `KeyTakeaways`, `SummaryBox`, `ProsCons`, `StepGuide`, `References`, `Footnotes`, `AuthorNote`, `ExpertInsight`, `ResourceList`, `QuickFacts` |
| `content/audio-player.tsx` | `AudioPlayer` — on-brand, keyboard-seekable, reduced-motion safe |
| `content/reading-progress.tsx` | `ReadingProgress` — fixed scroll-progress bar (mounted on the article route only) |

## Block → component coverage

Every requested item is exercised in the article:

- **Typography:** H1 (page title) · H2/H3/H4 · lead · paragraph · small · caption · highlight · bold · italic · underline · inline code · kbd · sub · sup · links
- **Lists:** unordered · ordered · nested · checklist
- **Media:** featured image · inline image · captioned image · side-by-side · gallery · video embed · audio player
- **Quotes:** blockquote · pull quote · citation
- **Code:** inline code · code block · syntax highlighting · copy button · filename header
- **Tables:** standard · responsive · comparison · pricing
- **Callouts:** note · tip · info · success · warning · error
- **Interactive:** FAQ accordion · tabs · expand/collapse · tooltip · popover
- **Embeds:** YouTube · social placeholder · map
- **Data:** statistic cards · metrics grid · progress bars · comparison cards
- **Utility:** divider · spacer · badge · tag/chip · reading progress bar · breadcrumb
- **Conversion:** CTA banner · newsletter signup · download card · button group
- **Knowledge:** key takeaways · summary · pros & cons · step-by-step · timeline · references · footnotes
- **Advanced:** author note · expert insight · related content card · resource list · quick facts

## Accessibility & SEO notes

- Single `<h1>` (post title); in-body headings start at `<h2>` with slug `id`s for deep links.
- Footnote refs/back-links wired via `#fn-N` / `#fnref-N`; references open in new tabs with `rel="noopener"`.
- Audio scrubber and reading-progress bar expose proper ARIA (`slider`/`progressbar`) and keyboard control.
- Placeholder images carry `role="img"` + `aria-label`; embeds use lazy iframes with titles.
- All motion respects `prefers-reduced-motion` via the shared global CSS rule.
