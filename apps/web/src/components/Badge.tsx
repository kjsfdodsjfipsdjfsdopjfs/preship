import { cn } from "@/lib/utils";

type BadgeVariant = "critical" | "serious" | "moderate" | "minor" | "success" | "warning" | "info" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  serious: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  moderate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  minor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  success: "bg-green-500/15 text-green-400 border-green-500/20",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  default: "bg-neutral-800 text-neutral-200 border-neutral-700",
};

export default function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
