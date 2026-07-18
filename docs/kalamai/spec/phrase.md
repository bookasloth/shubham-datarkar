# SPEC — `phrase` (live in-editor suggestions) — DEFERRED to v2

Not in v1 [Q1]. Documented here so the interface is reserved and v1 doesn't paint it into a corner.

## Purpose (v2)
Live, in-editor term / entity / gap suggestions as the user writes — the client-side complement to `write`'s on-demand rescore.

## Why deferred
- Term coverage can run client-side (substring/normalized counting against cached `term_signals`) → cheap, live-able.
- Semantic coverage needs a server embed round-trip → cannot be truly live without misleading the user.
- v1 instruments rescore-button frequency [D14]; that data decides v2 shape: full debounced-live vs split (terms live client-side, semantic on-demand).

## v1 obligations that keep the door open
- `kalamai_term_signals` is already client-consumable (gated terms + target ranges) — a v2 client can read it without a server call.
- The rescore route returns `gaps` in a stable shape reusable by a live surface.

No build, no tests in v1.
