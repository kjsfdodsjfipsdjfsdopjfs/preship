import { cn } from "@/lib/utils";

interface UsageMeterProps {
  used: number;
  limit: number;
  label?: string;
  className?: string;
}

export default function UsageMeter({ used, limit, label, className }: UsageMeterProps) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-sm text-neutral-300">{label}</span>}
        <span className={cn("text-sm font-medium tabular-nums", isOverLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-neutral-300")}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", isOverLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-orange-500")} style={{ width: `${percentage}%` }} />
      </div>
      {isNearLimit && !isOverLimit && <p className="text-xs text-yellow-400 mt-1">Approaching limit</p>}
      {isOverLimit && <p className="text-xs text-red-400 mt-1">Limit reached</p>}
    </div>
  );
}
