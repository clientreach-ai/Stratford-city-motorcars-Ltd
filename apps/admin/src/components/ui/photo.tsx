"use client";

import Image from "next/image";
import { Car, ImageOff } from "lucide-react";
import { useState } from "react";

import { isPhotoVariantSrc, photoVariantSrc, type PhotoVariants } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { SITE_URL } from "@/lib/api";

/**
 * A vehicle photograph, from wherever it lives:
 *
 *  - `sample:<category>`  a placeholder frame (sample data has no real photos)
 *  - `/sample/…`          a file bundled with the admin for sample data
 *  - `data:` / `blob:`    a photograph just added in this browser
 *  - `/media/…`           the website's media route, resolved against the site
 *  - `https://…`          object storage behind a CDN
 *
 * A stored photograph with `variants` is drawn from the WebP files the API made
 * when it was uploaded, with `sizes` choosing among them, so a thumbnail never
 * downloads the full-size master. So is a `src` that is already a variant (a
 * cover preview). Anything else goes through the image optimiser.
 */
export function Photo({
  src,
  variants,
  alt,
  className,
  sizes = "96px",
  label,
  priority,
}: {
  src: string | null | undefined;
  /** The stored photograph's delivery variants, when it has them. */
  variants?: PhotoVariants;
  alt: string;
  className?: string;
  sizes?: string;
  /** Shown on the placeholder, e.g. "Exterior". */
  label?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return (
      <span role="img" aria-label="No photograph yet" className={cn("relative flex items-center justify-center overflow-hidden bg-ink-100 text-ink-500", className)}>
        <Car className="size-[38%] max-h-8 max-w-8" strokeWidth={1.25} aria-hidden />
      </span>
    );
  }

  if (src.startsWith("sample:")) {
    const category = label ?? src.slice("sample:".length);
    return (
      <span role="img" aria-label={alt || `Sample ${category} photograph`} className={cn("sample-frame @container relative flex flex-col items-center justify-center gap-1 overflow-hidden text-ink-500", className)}>
        <Car className="size-[34%] max-h-10 max-w-10" strokeWidth={1.1} aria-hidden />
        <span aria-hidden className="hidden font-roman text-[0.5rem] tracking-[0.2em] uppercase @[7rem]:block">
          {category}
        </span>
      </span>
    );
  }

  if (failed) {
    return (
      <span role="img" aria-label={`${alt} (preview unavailable)`} className={cn("flex items-center justify-center bg-ink-100 text-ink-500", className)}>
        <ImageOff className="size-5" strokeWidth={1.25} aria-hidden />
      </span>
    );
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      <span className={cn("relative block overflow-hidden bg-ink-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- in-browser photographs cannot go through the optimiser */}
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  const resolve = (path: string) => (path.startsWith("/sample/") || /^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);
  const resolved = resolve(src);

  if (variants?.formats.includes("webp")) {
    const widths = variants.widths;
    return (
      <span className={cn("relative block overflow-hidden bg-ink-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- already encoded for the web at upload */}
        <img
          src={resolve(photoVariantSrc(src, widths.find((width) => width >= 640) ?? widths[widths.length - 1]!, "webp", variants.revision))}
          srcSet={widths.map((width) => `${resolve(photoVariantSrc(src, width, "webp", variants.revision))} ${width}w`).join(", ")}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-ink-100", className)}>
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isPhotoVariantSrc(src)}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
