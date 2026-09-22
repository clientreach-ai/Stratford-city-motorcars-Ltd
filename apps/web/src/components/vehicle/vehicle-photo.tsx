"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { preload } from "react-dom";
import { ImageOff } from "lucide-react";

import { photoVariantSrc } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import type { VehicleImage } from "@/lib/inventory/types";

/**
 * Quality for photographs stored before variants existed, which still go
 * through the image optimiser (next.config.ts `qualities`).
 */
const FALLBACK_QUALITY = 85;

/**
 * Screens this dense (most current phones, at 2.6–3.5×) are sent photographs
 * sized for 2× instead. At arm's length the eye resolves no more photographic
 * detail beyond about 2×, so the picture looks the same, but the file is about
 * half the size — on a slow mobile connection that is the difference between
 * the first photograph arriving in about 2 s and about 3 s. Nothing is
 * compressed harder: these screens simply get a smaller one of the same files.
 */
const DENSE_SCREEN = "(min-resolution: 2.5dppx)";
const DENSE_SCALE = 2 / 3;

/** Scales the lengths in a `sizes` attribute, leaving its media conditions alone. */
function scaleSizes(sizes: string, factor: number): string {
  return sizes
    .split(",")
    .map((entry) =>
      entry.replace(/(\d+(?:\.\d+)?)(vw|px)\s*$/, (_, value: string, unit: string) => `${Math.round(Number(value) * factor)}${unit}`),
    )
    .join(",");
}

/**
 * A vehicle photograph: the right file for the screen, and never a broken box.
 *
 * Delivery. Photographs stored with variants (see the API's media/photos.ts)
 * are served as they were encoded — a `<picture>` offering AVIF, then WebP, at
 * every stored width, with `sizes` telling the browser how wide the photograph
 * will be drawn. The browser picks the smallest file that is sharp at the
 * screen's pixel density, and no second round of compression softens the
 * detail. Older photographs without variants go through the image optimiser.
 *
 * Loading. Everything is lazy unless `priority` is set; a priority photograph
 * (the LCP) is fetched eagerly at high priority and preloaded in the document
 * head, so the browser starts it before it has laid the page out. While any
 * photograph loads, its blurred placeholder is painted in its place, so a slow
 * connection sees the car's shape and colour at once rather than an empty
 * frame.
 *
 * Layout. Every vehicle photograph fills a positioned box whose aspect ratio
 * the layout sets, so nothing moves as photographs arrive.
 *
 * Failure. A photograph whose file has gone missing shows a quiet placeholder
 * instead of the black box a failed image leaves on a dark tile.
 */
export function VehiclePhoto({
  image,
  alt = image.alt,
  sizes,
  className,
  style,
  priority = false,
  fetchPriority,
  blur = true,
  onLoad,
}: {
  image: VehicleImage;
  /** Defaults to the photograph's own description; "" for a decorative copy. */
  alt?: string;
  /** How wide the photograph is drawn, as the `sizes` attribute. */
  sizes: string;
  className?: string;
  style?: CSSProperties;
  /** The page's LCP photograph: eager, high priority, preloaded. */
  priority?: boolean;
  /** For eager photographs that must not compete with the LCP (the hero's later cars). */
  fetchPriority?: "high" | "low" | "auto";
  /** Paint the blurred placeholder behind the photograph while it loads (off for letterboxed views). */
  blur?: boolean;
  onLoad?: () => void;
}) {
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

  const placeholder: CSSProperties | undefined =
    blur && image.placeholder
      ? { backgroundImage: `url(${image.placeholder})`, backgroundSize: "cover", backgroundPosition: "center" }
      : undefined;

  const variants = image.variants;
  if (!variants) {
    return (
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        quality={FALLBACK_QUALITY}
        priority={priority}
        fetchPriority={fetchPriority}
        className={className}
        style={{ ...placeholder, ...style }}
        onLoad={onLoad}
        onError={() => setMissing(true)}
      />
    );
  }

  const srcSet = (format: "avif" | "webp") =>
    variants.widths.map((width) => `${photoVariantSrc(image.src, width, format, variants.revision)} ${width}w`).join(", ");
  const largest = variants.widths[variants.widths.length - 1]!;
  const fallbackFormat = variants.formats.includes("webp") ? "webp" : variants.formats[0]!;
  const fallbackSrc = photoVariantSrc(image.src, largest, fallbackFormat, variants.revision);

  const denseSizes = scaleSizes(sizes, DENSE_SCALE);
  const hasAvif = variants.formats.includes("avif");

  if (priority && hasAvif) {
    // One preload per kind of screen, matching the <source> the browser will
    // pick; browsers without AVIF skip a preload whose type they cannot decode.
    for (const [media, imageSizes] of [
      [DENSE_SCREEN, denseSizes],
      [`not all and ${DENSE_SCREEN}`, sizes],
    ] as const) {
      preload(photoVariantSrc(image.src, largest, "avif", variants.revision), {
        as: "image",
        type: "image/avif",
        media,
        imageSrcSet: srcSet("avif"),
        imageSizes,
        fetchPriority: "high",
      });
    }
  }

  return (
    <picture>
      {hasAvif ? <source type="image/avif" media={DENSE_SCREEN} srcSet={srcSet("avif")} sizes={denseSizes} /> : null}
      {hasAvif ? <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} /> : null}
      <source type={`image/${fallbackFormat}`} media={DENSE_SCREEN} srcSet={srcSet(fallbackFormat)} sizes={denseSizes} />
      <img
        src={fallbackSrc}
        srcSet={srcSet(fallbackFormat)}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        decoding={priority ? undefined : "async"}
        className={cn("absolute inset-0 size-full", className)}
        style={{ ...placeholder, ...style }}
        onLoad={onLoad}
        onError={() => setMissing(true)}
      />
    </picture>
  );
}
