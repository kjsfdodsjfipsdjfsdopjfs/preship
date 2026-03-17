"use client";

import { useState, useEffect, useRef } from "react";

function useCounter(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { value, ref };
}

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  className?: string;
  label: string;
}

export default function AnimatedCounter({ end, duration = 2500, className, label }: AnimatedCounterProps) {
  const counter = useCounter(end, duration);

  return (
    <div ref={counter.ref}>
      <p className={`text-5xl md:text-6xl font-bold tabular-nums ${className ?? ""}`}>
        {counter.value.toLocaleString()}
      </p>
      <p className="mt-2 text-neutral-300">{label}</p>
    </div>
  );
}
