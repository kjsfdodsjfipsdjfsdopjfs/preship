import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-800 bg-neutral-900 p-6",
        hover && "transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-800 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
