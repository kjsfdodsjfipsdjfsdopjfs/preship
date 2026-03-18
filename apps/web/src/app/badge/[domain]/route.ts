import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.preship.dev";

function getScoreColor(score: number): string {
  if (score > 80) return "#22c55e"; // green
  if (score >= 50) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function makeBadgeSVG(
  label: string,
  value: string,
  valueColor: string,
  labelBg: string = "#F97316"
): string {
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 7 + 12;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${valueColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="13">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="13">${value}</text>
  </g>
</svg>`;
}

function notScannedBadge(): string {
  return makeBadgeSVG("PreShip", "not scanned", "#555", "#F97316");
}

function errorBadge(): string {
  return makeBadgeSVG("PreShip", "error", "#555", "#F97316");
}

function svgResponse(svg: string): NextResponse {
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await params;
  const domain = rawDomain.replace(/\.svg$/i, "");

  if (!domain || domain.length > 253) {
    return svgResponse(errorBadge());
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/scans?url=https://${encodeURIComponent(domain)}&limit=1`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return svgResponse(notScannedBadge());
    }

    const data = await res.json();
    const scans = Array.isArray(data) ? data : data?.scans ?? data?.data ?? [];

    if (scans.length === 0) {
      return svgResponse(notScannedBadge());
    }

    const scan = scans[0];
    const score = Math.round(Number(scan.score ?? scan.overall_score ?? 0));
    const color = getScoreColor(score);

    return svgResponse(makeBadgeSVG("PreShip", String(score), color));
  } catch {
    return svgResponse(errorBadge());
  }
}
