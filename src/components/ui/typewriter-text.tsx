"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type TypewriterTextProps = {
  text: string;
  className?: string;
  cursorClassName?: string;
  speedMs?: number;
  startDelayMs?: number;
};

export function TypewriterText({
  text,
  className,
  cursorClassName,
  speedMs = 40,
  startDelayMs = 250,
}: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let intervalId: number | undefined;

    const startTimeout = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setVisibleCount((currentValue) => {
          if (currentValue >= text.length) {
            if (intervalId) {
              window.clearInterval(intervalId);
            }
            return currentValue;
          }

          return currentValue + 1;
        });
      }, speedMs);
    }, startDelayMs);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [speedMs, startDelayMs, text]);

  const visibleText = text.slice(0, visibleCount);
  const isComplete = visibleCount >= text.length;

  return (
    <p className={cn("relative z-10", className)} aria-label={text}>
      <span>{visibleText}</span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-0.5 inline-block animate-pulse text-primary/80",
          isComplete && "opacity-60",
          cursorClassName,
        )}
      >
        |
      </span>
    </p>
  );
}
