import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getJob } from "@/lib/content";

/**
 * Link-preview images (WhatsApp, Facebook, LinkedIn, X).
 *   /api/og            → the site card
 *   /api/og?job=slug   → a "We're hiring" card for a role
 * Latin-only on purpose: the image renderer can't shape Arabic script.
 */
const fontDir = join(process.cwd(), "assets", "fonts");
const INK = "#0e0d0c";
const CHALK = "#f3f0eb";
const SMOKE = "#aba59c";
const SIGNAL = "#ff5b1f";

const TYPES: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  freelance: "Freelance",
  talent: "Talent pool",
};
const PLACES: Record<string, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };

function Wordmark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <span style={{ fontFamily: "Mona", fontWeight: 900, fontStyle: "italic", fontSize: size, color: CHALK, letterSpacing: -size * 0.04, lineHeight: 1 }}>
        SCALE
      </span>
      <span
        style={{
          marginLeft: size * 0.08,
          marginTop: size * 0.02,
          padding: `${size * 0.05}px ${size * 0.12}px`,
          background: SIGNAL,
          color: INK,
          fontFamily: "Mona",
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: size * 0.3,
          transform: "skewX(-14deg)",
        }}
      >
        ADV
      </span>
    </div>
  );
}

function Timeline() {
  const beats = [
    ["HOOK", 3],
    ["STORY", 9],
    ["PRODUCT", 8],
    ["PROOF", 6],
    ["CTA", 4],
  ] as const;
  return (
    <div style={{ display: "flex", width: "100%", height: 46, gap: 4, position: "relative" }}>
      {beats.map(([label, secs], i) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            flexGrow: secs,
            flexBasis: 0,
            paddingLeft: 12,
            background: i === 0 ? SIGNAL : "#23201d",
            borderLeft: `4px solid ${i === 0 ? SIGNAL : "#4a453f"}`,
            color: i === 0 ? INK : SMOKE,
            fontFamily: "Mona",
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("job");
  const [black, medium] = await Promise.all([
    readFile(join(fontDir, "mona-sans-latin-900-italic.woff")),
    readFile(join(fontDir, "mona-sans-latin-500-normal.woff")),
  ]);
  const job = slug ? await getJob(slug) : null;

  const body = job ? (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: INK }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark size={64} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: CHALK, fontFamily: "Mona", fontWeight: 500, fontSize: 24, letterSpacing: 3 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#ff3b2f" }} />
          WE&apos;RE HIRING
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Mona", fontWeight: 900, fontStyle: "italic", fontSize: job.title.en.length > 28 ? 84 : 104, lineHeight: 0.95, color: CHALK, letterSpacing: -2 }}>
          {job.title.en || "Open role"}
        </div>
        <div style={{ marginTop: 28, fontFamily: "Mona", fontWeight: 500, fontSize: 30, color: SMOKE }}>
          {[TYPES[job.type], PLACES[job.workplace], job.location.en].filter(Boolean).join("  ·  ")}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Mona", fontWeight: 500, fontSize: 24 }}>
        <span style={{ color: SIGNAL }}>Apply on the SCALE ADV careers page</span>
        <span style={{ color: SMOKE }}>@scale_adv</span>
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: INK }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark size={64} />
        <span style={{ fontFamily: "Mona", fontWeight: 500, fontSize: 22, color: SMOKE, letterSpacing: 3 }}>PERFORMANCE CREATIVE · EGYPT</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontFamily: "Mona", fontWeight: 900, fontStyle: "italic", fontSize: 96, lineHeight: 0.92, letterSpacing: -3 }}>
        <span style={{ color: CHALK }}>WE TURN ADS</span>
        <span style={{ color: SIGNAL }}>INTO CUSTOMERS.</span>
      </div>
      <Timeline />
    </div>
  );

  return new ImageResponse(body, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Mona", data: black, weight: 900, style: "italic" },
      { name: "Mona", data: medium, weight: 500, style: "normal" },
    ],
  });
}
