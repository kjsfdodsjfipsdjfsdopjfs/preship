import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PreShip - Quality Gate for AI-Generated Code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        {/* Orange glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(249,115,22,0.15), transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Logo text */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
              <path d="M18 36 L28 28 L36 8 L36 40 Z" fill="white" />
              <path d="M36 16 L46 40 L36 40 Z" fill="white" opacity="0.6" />
              <path d="M12 44 L52 44 L46 54 L18 54 Z" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: "48px", fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
            Pre<span style={{ color: "#F97316" }}>Ship</span>
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "white",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Quality Gate for AI-Generated Code
        </p>

        {/* Description */}
        <p
          style={{
            fontSize: "18px",
            color: "#9CA3AF",
            textAlign: "center",
            margin: "16px 0 0 0",
            maxWidth: "600px",
          }}
        >
          Accessibility, security & performance scanning for vibe-coded apps
        </p>

        {/* Badges */}
        <div style={{ display: "flex", gap: "12px", marginTop: "40px" }}>
          {["WCAG 2.2 AA", "OWASP Top 10", "Core Web Vitals"].map((badge) => (
            <div
              key={badge}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "#171717",
                color: "#9CA3AF",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {badge}
            </div>
          ))}
        </div>

        {/* URL */}
        <p
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "#F97316",
            fontWeight: 600,
          }}
        >
          preship.dev
        </p>
      </div>
    ),
    { ...size }
  );
}
