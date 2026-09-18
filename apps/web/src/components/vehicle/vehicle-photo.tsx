"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * A vehicle photograph that cannot look broken.
 *
 * A photograph whose file has gone missing is answered with an error rather
 * than an image, and the browser then draws nothing: on the dark tile a car
 * photograph sits in, that reads as a full-size black box, which is the last
 * thing a buyer should meet where a car should be. One missing file now shows
 * a quiet placeholder instead, and the rest of the card or gallery carries on.
 *
 * Every vehicle photograph on the site is a `fill` image inside a positioned
 * box, so the placeholder fills that same box.
 */
export function VehiclePhoto({ alt, ...props }: ImageProps) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span
        // Decorative photographs (the thumbnail rail) keep no name here either.
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className="absolute inset-0 flex items-center justify-center bg-[var(--muted)] text-[var(--muted-foreground)]"
      >
        <ImageOff aria-hidden className="size-6" />
      </span>
    );
  }

  return <Image {...props} alt={alt} onError={() => setMissing(true)} />;
}
