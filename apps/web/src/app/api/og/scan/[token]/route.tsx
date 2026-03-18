import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

function getScoreColorDim(score: number): string {
  if (score >= 80) return "rgba(34,197,94,0.15)";
  if (score >= 50) return "rgba(234,179,8,0.15)";
  return "rgba(239,68,68,0.15)";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let scanData: {
    url: string;
    overallScore: number;
    categories?: { category: string; score: number }[];
  } | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/scans/${token}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json = await res.json();
      scanData = json.data ?? json;
    }
  } catch {
    // fall through to fallback
  }

  if (!scanData) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0A0A0A",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#9CA3AF",
            fontSize: "32px",
          }}
        >
          Scan not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const domain = (() => {
    try {
      return new URL(scanData.url).hostname;
    } catch {
      return scanData.url;
    }
  })();

  const score = scanData.overallScore ?? 0;
  const scoreColor = getScoreColor(score);
  const categories = scanData.categories ?? [];

  // Pick the 3 main categories for display
  const displayCats = ["accessibility", "security", "performance"]
    .map((key) => {
      const found = categories.find((c) => c.category === key);
      return {
        label: key === "accessibility" ? "A11y" : key === "security" ? "Security" : "Perf",
        score: found?.score ?? 0,
      };
    });

  // SVG score ring
  const ringSize = 200;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle glow behind score */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "400px",
            height: "300px",
            background: `radial-gradient(ellipse, ${getScoreColorDim(score)}, transparent 70%)`,
            borderRadius: "50%",
          }}
        />

        {/* Logo + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
              <path d="M18 36 L28 28 L36 8 L36 40 Z" fill="white" />
              <path d="M36 16 L46 40 L36 40 Z" fill="white" opacity="0.6" />
              <path d="M12 44 L52 44 L46 54 L18 54 Z" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            PreShip
          </span>
        </div>

        {/* Domain */}
        <p
          style={{
            fontSize: "22px",
            color: "#9CA3AF",
            margin: "0 0 28px 0",
          }}
        >
          {domain}
        </p>

        {/* Score circle */}
        <div
          style={{
            position: "relative",
            width: `${ringSize}px`,
            height: `${ringSize}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={ringSize}
            height={ringSize}
            style={{ transform: "rotate(-90deg)", position: "absolute" }}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#2A2A2A"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${offset}`}
            />
          </svg>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 800,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#9CA3AF",
                marginTop: "4px",
              }}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Category scores */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "32px",
          }}
        >
          {displayCats.map((cat) => (
            <div
              key={cat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: getScoreColor(cat.score),
                  lineHeight: 1,
                }}
              >
                {cat.score}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Watermark */}
        <p
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "14px",
            color: "#F97316",
            fontWeight: 600,
          }}
        >
          preship.dev
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
}
