import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Score thresholds aligned with @preship/shared constants:
 *   EXCELLENT: 90, GOOD: 70, NEEDS_WORK: 50, POOR: 0
 */

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-green-300";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 70) return "bg-green-400";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function getScoreStrokeColor(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
