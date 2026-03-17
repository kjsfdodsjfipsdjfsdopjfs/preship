import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export default function StatsCard({ icon, value, label, trend, className }: StatsCardProps) {
  return (
    <div className={cn("rounded-xl border border-neutral-800 bg-neutral-900 p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800 text-orange-400" aria-hidden="true">{icon}</div>
        {trend && (
          <span className={cn("text-xs font-medium flex items-center gap-0.5", trend.positive ? "text-green-400" : "text-red-400")}>
            {trend.positive ? "\u2191" : "\u2193"} {trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-sm text-neutral-400 mt-1">{label}</p>
    </div>
  );
}
