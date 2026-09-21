import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * A run of a headline. `tone="muted"` sets the quieter half of a two-tone
 * headline; `accent` sets the brass italic the hero uses. `br` forces a line
 * break after the run (from `sm` up, where the lines have room to be set).
 */
export interface TextRun {
  text: string;
  tone?: "default" | "muted" | "accent";
  br?: boolean;
}

const tones = {
  default: "",
  muted: "text-[color-mix(in_oklab,var(--foreground)_42%,transparent)]",
  accent: "italic text-[var(--accent-text)]",
} as const;

/**
 * A headline whose words rise out of their own masks.
 *
 * Rendered on the server as plain words in spans, so the text is in the HTML,
 * selectable and indexable. Screen readers get the whole line from
 * `aria-label`; the word spans are hidden from them so it is never read word
 * by word.
 *
 * `play="load"` animates on page load with CSS alone (for headlines above the
 * fold); `play="scroll"` hands the element to the page's RevealObserver.
 */
export function SplitText({
  as: Tag = "h2",
  runs,
  play = "scroll",
  delay = 0,
  className,
  id,
}: {
  as?: ElementType;
  runs: TextRun[] | string;
  play?: "load" | "scroll";
  /** Milliseconds before the first word moves (load only). */
  delay?: number;
  className?: string;
  id?: string;
}) {
  const list: TextRun[] = typeof runs === "string" ? [{ text: runs }] : runs;
  const label = list.map((run) => run.text).join(" ").replace(/\s+/g, " ").trim();

  let index = 0;
  const content: ReactNode[] = [];

  list.forEach((run, runIndex) => {
    const words = run.text.split(/\s+/).filter(Boolean);
    words.forEach((word, wordIndex) => {
      const w = index++;
      content.push(
        <span key={`${runIndex}-${wordIndex}`} className={cn("word", tones[run.tone ?? "default"])}>
          <span className="word-inner" style={{ "--w": w } as CSSProperties}>
            {word}
          </span>
        </span>,
      );
      // Real spaces between words so the line wraps and copies naturally.
      if (wordIndex < words.length - 1 || runIndex < list.length - 1) content.push(" ");
    });
    if (run.br) content.push(<br key={`br-${runIndex}`} className="hidden sm:block" />);
  });

  return (
    <Tag
      id={id}
      aria-label={label}
      className={cn(play === "load" ? "intro-words" : "reveal reveal-words", className)}
      style={play === "load" ? ({ "--intro-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      <span aria-hidden>{content}</span>
    </Tag>
  );
}
