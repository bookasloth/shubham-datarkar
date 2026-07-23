import { ImageResponse } from "next/og";

/** Shared size/type for every per-segment opengraph-image route. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const ORANGE = "#FF4D00";
const CHARCOAL = "#0E0E10";
const PANEL = "#F4F4F3";
const MUTED = "#A1A1AA";

/** Page-type icon (lucide paths, 24×24, stroke) rendered white in the badge/chip. */
type Kind = "home" | "blog" | "projects" | "services" | "case" | "product" | "book" | "me" | "page";

const ICONS: Record<Kind, string[]> = {
  home: ["M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", "M9 21v-8h6v8"],
  blog: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  projects: ["M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"],
  services: ["M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  case: ["M3 3v18h18", "M7 15l3-4 3 2 4-6"],
  product: ["M21 8 12 3 3 8v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8"],
  book: ["M3 5h18v16H3z", "M8 3v4", "M16 3v4", "M3 10h18"],
  me: ["M20 21a8 8 0 0 0-16 0", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  page: ["M6 3h9l5 5v13H6z", "M15 3v5h5", "M9 13h6", "M9 17h6"],
};

function Icon({ paths, size, color }: { paths: string[]; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** 5×5 dot grid, top-right accent motif. */
function DotGrid() {
  const dots = Array.from({ length: 25 });
  return (
    <div style={{ position: "absolute", top: 56, right: 60, display: "flex", flexWrap: "wrap", width: 108, gap: 12 }}>
      {dots.map((_, i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: 8, background: ORANGE, opacity: 0.9 }} />
      ))}
    </div>
  );
}

/** The light "window" motif on the panel — a stylised browser/card. */
function WindowMotif({ kind }: { kind: Kind }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 96,
        top: 168,
        width: 320,
        height: 236,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 18,
        border: "1px solid #E6E6E4",
        boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, paddingLeft: 16, borderBottom: "1px solid #ECECEA" }}>
        <div style={{ width: 10, height: 10, borderRadius: 10, background: "#D4D4D2" }} />
        <div style={{ width: 10, height: 10, borderRadius: 10, background: "#D4D4D2" }} />
        <div style={{ width: 10, height: 10, borderRadius: 10, background: "#D4D4D2" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: 18, gap: 12 }}>
        <div style={{ display: "flex", width: "100%", height: 78, borderRadius: 10, background: "rgba(255,77,0,0.12)", border: `1px solid rgba(255,77,0,0.35)` }} />
        <div style={{ display: "flex", width: "80%", height: 12, borderRadius: 6, background: "#E4E4E2" }} />
        <div style={{ display: "flex", width: "95%", height: 12, borderRadius: 6, background: "#ECECEA" }} />
        <div style={{ display: "flex", width: "60%", height: 12, borderRadius: 6, background: "#ECECEA" }} />
      </div>
    </div>
  );
}

// Fonts fetched once from Google Fonts and reused across renders. If the fetch
// fails, we fall back to Satori's default sans rather than break the image.
let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 800; style: "normal" }[]> | null = null;
async function loadFonts() {
  if (!fontCache) {
    fontCache = (async () => {
      const specs = [
        { name: "Jakarta", family: "Plus+Jakarta+Sans", weight: 800 as const },
        { name: "Poppins", family: "Poppins", weight: 400 as const },
        { name: "Poppins", family: "Poppins", weight: 600 as const },
      ];
      return Promise.all(
        specs.map(async (s) => {
          const css = await fetch(`https://fonts.googleapis.com/css2?family=${s.family}:wght@${s.weight}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          }).then((r) => r.text());
          const url = css.match(/src:\s*url\((https:[^)]+)\)\s*format/)?.[1];
          if (!url) throw new Error(`font url not found for ${s.family}`);
          const data = await fetch(url).then((r) => r.arrayBuffer());
          return { name: s.name, data, weight: s.weight, style: "normal" as const };
        }),
      );
    })().catch(() => []);
  }
  return fontCache;
}

/**
 * One dark, orange-accented OG card — charcoal text panel on the left, a light
 * angled panel with a window motif on the right, per-page category chip + icon.
 * Shared by every dynamic segment and the root card.
 */
export async function ogImage(input: { category: string; title: string; subtitle?: string; kind?: Kind }) {
  const kind = input.kind ?? "page";
  const paths = ICONS[kind];
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background: CHARCOAL,
          overflow: "hidden",
          fontFamily: "Poppins",
        }}
      >
        {/* angled light panel, right */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -90,
            width: 640,
            height: 750,
            background: PANEL,
            transform: "skewX(-9deg)",
            display: "flex",
          }}
        />

        <DotGrid />
        <WindowMotif kind={kind} />

        {/* floating orange badge, overlapping the motif */}
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 340,
            width: 104,
            height: 104,
            borderRadius: 104,
            background: ORANGE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 40px rgba(255,77,0,0.4)",
          }}
        >
          <Icon paths={paths} size={48} color="#ffffff" />
        </div>

        {/* left text column */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: 72, width: 660, height: "100%", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 13, background: ORANGE }}>
              <Icon paths={paths} size={26} color="#ffffff" />
            </div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 3, color: ORANGE }}>
              {input.category.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 34, fontFamily: "Jakarta", fontWeight: 800, fontSize: input.title.length > 30 ? 60 : 72, lineHeight: 1.04, letterSpacing: -1, color: "#ffffff" }}>
            {input.title}
          </div>

          <div style={{ display: "flex", marginTop: 22, width: 72, height: 6, borderRadius: 6, background: ORANGE }} />

          {input.subtitle ? (
            <div style={{ display: "flex", marginTop: 26, fontSize: 27, lineHeight: 1.4, color: MUTED, maxWidth: 470 }}>{input.subtitle}</div>
          ) : null}
        </div>

        {/* brand + domain, bottom-left */}
        <div style={{ position: "absolute", left: 72, bottom: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: ORANGE, fontFamily: "Jakarta", fontWeight: 800, fontSize: 16, color: "#fff" }}>
            SD
          </div>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 600, color: "#8A8A93" }}>shubhamdatarkar.com</div>
        </div>

        {/* bottom accent line under the text panel */}
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 430, height: 6, background: ORANGE }} />
      </div>
    ),
    { ...OG_SIZE, ...(fonts.length ? { fonts } : {}) },
  );
}
