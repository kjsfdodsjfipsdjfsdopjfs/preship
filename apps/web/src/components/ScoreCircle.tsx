"use client";

import { useEffect, useState } from "react";
import { cn, getScoreStrokeColor, getScoreLabel } from "@/lib/utils";

interface ScoreCircleProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
}

const sizeMap = {
  sm: { width: 64, stroke: 4, fontSize: "text-lg", labelSize: "text-[10px]" },
  md: { width: 96, stroke: 5, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { width: 160, stroke: 6, fontSize: "text-4xl", labelSize: "text-sm" },
};

export default function ScoreCircle({ score, size = "md", showLabel = false, className, animated = true }: ScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const config = sizeMap[size];
  const radius = (config.width - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;
  const color = getScoreStrokeColor(score);

  useEffect(() => {
    if (!animated) { setDisplayScore(score); return; }
    let frame: number;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, animated]);

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)} role="img" aria-label={`Score: ${score} out of 100, ${getScoreLabel(score)}`}>
      <svg width={config.width} height={config.width} className="transform -rotate-90" aria-hidden="true">
        <circle cx={config.width / 2} cy={config.width / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={config.stroke} />
        <circle
          cx={config.width / 2} cy={config.width / 2} r={radius} fill="none"
          stroke={color} strokeWidth={config.stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", config.fontSize)} style={{ color }}>{displayScore}</span>
        {showLabel && <span className={cn("text-neutral-400 mt-0.5", config.labelSize)}>{getScoreLabel(score)}</span>}
      </div>
    </div>
  );
}
