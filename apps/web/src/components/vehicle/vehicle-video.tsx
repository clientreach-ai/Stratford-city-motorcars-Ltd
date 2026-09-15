"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import type { VehicleVideo as Video } from "@/lib/inventory/types";

/**
 * A walkaround video.
 *
 * Hosted files use the native player with `preload="none"`, so nothing
 * downloads until the buyer presses play. YouTube and Vimeo are shown as a
 * plain poster button and the embed is only created on click — third-party
 * players are heavy and set cookies, and most visitors never press play.
 */
export function VehicleVideo({ video, vehicleName }: { video: Video; vehicleName: string }) {
  const label = video.title || `${vehicleName} walkaround video`;

  if (video.source.type === "file") {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-ink-950">
        <video
          controls
          playsInline
          preload="none"
          poster={video.poster}
          aria-label={label}
          className="size-full object-contain"
        >
          <source src={video.source.src} type={video.source.mimeType === "video/quicktime" ? "video/mp4" : video.source.mimeType} />
          Your browser cannot play this video.
        </video>
      </div>
    );
  }

  return <EmbedFacade video={video} label={label} />;
}

function EmbedFacade({ video, label }: { video: Video; label: string }) {
  const [active, setActive] = useState(false);
  const source = video.source;
  if (source.type === "file") return null;

  const embedUrl =
    source.type === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${source.videoId}?autoplay=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${source.videoId}?autoplay=1&dnt=1`;

  const poster =
    video.poster ?? (source.type === "youtube" ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg` : undefined);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-ink-950">
      {active ? (
        <iframe
          src={embedUrl}
          title={label}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label={`Play ${label}`}
        >
          {poster ? (
            // A plain lazy <img>: the poster is below the fold and comes from the
            // video host, so it is not routed through the image optimiser.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
          ) : null}
          <span className="relative flex size-16 items-center justify-center border border-bone/40 bg-ink-950/70 text-bone backdrop-blur-[2px] transition-colors group-hover:bg-ink-950">
            <Play className="ml-0.5 size-6" aria-hidden />
          </span>
          <span className="absolute bottom-4 left-4 bg-ink-950/70 px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-bone">
            Walkaround video
          </span>
        </button>
      )}
    </div>
  );
}
