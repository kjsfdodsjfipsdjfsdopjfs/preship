import { cn, formatRelativeTime, getScoreBgColor } from "@/lib/utils";
import ScoreCircle from "./ScoreCircle";

interface ProjectCardProps {
  id: string;
  name: string;
  url: string;
  score: number;
  lastScanned: string;
  scanCount?: number;
  className?: string;
}

export default function ProjectCard({ id, name, url, score, lastScanned, scanCount, className }: ProjectCardProps) {
  return (
    <a href={`/dashboard/projects/${id}`} className={cn("block rounded-xl border border-neutral-800 bg-neutral-900 p-5 hover:border-neutral-700 hover:bg-neutral-800 transition-all duration-200 group", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors truncate">{name}</h3>
          <p className="text-xs text-neutral-500 truncate mt-0.5">{url}</p>
        </div>
        <ScoreCircle score={score} size="sm" animated={false} />
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Last scanned {formatRelativeTime(lastScanned)}</span>
        {scanCount !== undefined && <span>{scanCount} scans</span>}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", getScoreBgColor(score))} style={{ width: `${score}%` }} />
      </div>
    </a>
  );
}
