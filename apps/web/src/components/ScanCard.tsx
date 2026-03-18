import { cn, formatRelativeTime, getScoreColor } from "@/lib/utils";
import ScoreCircle from "./ScoreCircle";
import Badge from "./Badge";

interface ScanCardProps {
  id: string;
  url: string;
  score: number;
  date: string;
  status: "completed" | "running" | "failed" | "queued";
  violations?: number;
  className?: string;
}

export default function ScanCard({ id, url, score, date, status, violations, className }: ScanCardProps) {
  const statusBadge = {
    completed: <Badge variant="success">Completed</Badge>,
    running: <Badge variant="warning"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />Running</span></Badge>,
    failed: <Badge variant="critical">Failed</Badge>,
    queued: <Badge variant="default">Queued</Badge>,
  };

  return (
    <a href={`/dashboard/scans/${id}`} className={cn("flex items-center gap-4 p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 hover:bg-neutral-800 transition-all duration-200", className)}>
      <ScoreCircle score={score} size="sm" animated={false} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{url}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {formatRelativeTime(date)}
          {violations != null && violations > 0 && <span className="ml-2"><span className={getScoreColor(score)}>{violations}</span> violations</span>}
        </p>
      </div>
      {statusBadge[status]}
    </a>
  );
}
