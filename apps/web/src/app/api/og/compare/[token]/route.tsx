import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

/**
 * Rough percentile estimate based on score.
 * Maps score to "better than X% of scanned sites".
 * This is an approximation — adjust once real data is available.
 */
function estimatePercentile(score: number): number {
  if (score >= 95) return 99;
  if (score >= 90) return 95;
  if (score >= 85) return 90;
  if (score >= 80) return 82;
  if (score >= 75) return 72;
  if (score >= 70) return 62;
  if (score >= 65) return 52;
  if (score >= 60) return 42;
  if (score >= 50) return 30;
  if (score >= 40) return 18;
  if (score >= 30) return 10;
  if (score >= 20) return 5;
  return 2;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let scanData: {
    url: string;
    overallScore: number;
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
    // fall through
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
  const percentile = estimatePercentile(score);
  const scoreColor = getScoreColor(score);

  // Progress bar width (percentile-based)
  const barWidth = Math.max(percentile, 3);

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
          padding: "60px 80px",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: `radial-gradient(ellipse, rgba(249,115,22,0.08), transparent 70%)`,
            borderRadius: "50%",
          }}
        />

        {/* Logo + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
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
            fontSize: "20px",
            color: "#6B7280",
            margin: "0 0 40px 0",
          }}
        >
          {domain}
        </p>

        {/* Main stat */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              color: "#9CA3AF",
              marginBottom: "8px",
            }}
          >
            This app scores better than
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "96px",
                fontWeight: 800,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {percentile}%
            </span>
          </div>
          <span
            style={{
              fontSize: "24px",
              color: "#9CA3AF",
              marginTop: "8px",
            }}
          >
            of scanned sites
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            height: "12px",
            borderRadius: "6px",
            background: "#1F1F1F",
            marginTop: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              borderRadius: "6px",
              background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`,
            }}
          />
        </div>

        {/* Score label */}
        <p
          style={{
            fontSize: "16px",
            color: "#6B7280",
            marginTop: "16px",
          }}
        >
          Score: {score}/100
        </p>

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
