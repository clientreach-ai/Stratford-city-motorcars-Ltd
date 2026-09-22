"use client";

import { useState, ViewTransition } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { VehiclePhoto } from "@/components/vehicle/vehicle-photo";
import type { VehicleImage } from "@/lib/inventory/types";

/** The view-transition name shared by a car's card photo and its gallery. */
export const carPhotoTransitionName = (vehicleId: string) => `car-photo-${vehicleId}`;

/**
 * The photograph at the top of a stock card.
 *
 * On a mouse hover the card turns the car round: a second photograph (the
 * next exterior shot, or the interior) dissolves in over the cover while both
 * drift in slowly. The second photograph is not downloaded until the first
 * hover, so a grid of cards costs one image each until someone shows
 * interest. Touch screens keep the cover — there is no hover to answer.
 *
 * The frame carries the car's view-transition name, so following the card
 * carries the photograph into the car's own gallery.
 */
export function CardPhoto({
  vehicleId,
  cover,
  alternate,
  sizes,
  priority = false,
}: {
  vehicleId: string;
  cover: VehicleImage;
  alternate?: VehicleImage;
  sizes: string;
  priority?: boolean;
}) {
  const [wanted, setWanted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <ViewTransition name={carPhotoTransitionName(vehicleId)} share="car-photo" default="none">
      <div
        className="absolute inset-0"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && alternate) setWanted(true);
        }}
      >
        <VehiclePhoto
          image={cover}
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
        />
        {alternate && wanted ? (
          <VehiclePhoto
            image={alternate}
            alt=""
            blur={false}
            sizes={sizes}
            onLoad={() => setLoaded(true)}
            className={cn(
              "object-cover opacity-0 transition-[opacity,transform] duration-[900ms,1400ms] ease-[var(--ease-out-expo)]",
              "group-hover:scale-[1.06]",
              loaded && "group-hover:opacity-100",
            )}
          />
        ) : null}
      </div>
    </ViewTransition>
  );
}
