# Vehicle photography

The single highest-value change available to this website is photographs of
the actual cars. Everything else is built and waiting for them.

## Where things stand

The dealership's inventory holds **no photography** — every vehicle in the
previous site's API returned `"images": []`, and that site displayed the words
"Photography Coming Soon". So the new site does two things:

1. Where a vehicle has no photographs, it shows a designed catalogue plate
   (marque, year, "Photography to follow", and a prompt to call). It reads as
   deliberate rather than broken — the way an auction catalogue handles a lot
   that arrives before the photographer does.
2. Where a vehicle has photographs, the full gallery, lightbox and thumbnail
   rail take over automatically. No code changes needed.

### Why there are no stock photographs

Free, commercially licensed photography was researched thoroughly:

| Source | Verdict |
| --- | --- |
| Wikimedia Commons | Model-accurate but documentary — car parks, foreign number plates, event crowds, a pink Silver Shadow, and in one case a written-off Rolls-Royce. |
| Openverse / Flickr (CC) | Enthusiast snapshots. Better composition occasionally, but colours rarely match and most usable frames are `CC BY-SA` or `CC BY-ND`, neither of which suits a commercial site. |
| Unsplash | Bot-protected; not scraped. |

Across all seven vehicles, exactly one image was both commercially licensed
(CC0) and colour-accurate: the white-with-navy-hood Rolls-Royce Dawn now shown
on that listing, credited in the caption. It is there so the gallery, lightbox
and credit line have a real image to exercise, and so the treatment can be
judged before deciding whether to extend it. Remove it by emptying
`libraryImages` in `src/lib/inventory/data.ts`.

## Adding real photographs

1. Put the files in `public/vehicles/<vehicle-slug>/`, e.g.
   `public/vehicles/mercedes-benz-sl63-amg-2016/exterior-front.webp`.
2. Convert and size them once, before committing:

   ```bash
   # 2400px on the long edge is plenty — next/image derives everything smaller.
   magick input.jpg -resize 2400x -quality 82 exterior-front.webp
   ```

3. Add them to the vehicle's `images` array in
   `src/lib/inventory/data.ts`. Put the best three-quarter exterior first —
   it becomes the card thumbnail, the Open Graph image and the LCP element.

   ```ts
   images: [
     {
       src: "/vehicles/mercedes-benz-sl63-amg-2016/exterior-front.webp",
       alt: "2016 Mercedes-Benz SL63 AMG in obsidian black, front three-quarter view",
       width: 2400,
       height: 1500,
       provenance: "dealer",
     },
     // …
   ],
   ```

`images` always wins over `libraryImages`, and the "library image" caption
disappears on its own once dealer photographs exist.

**`alt` text matters.** Describe the car and the angle, as above. It is read
aloud by screen readers and indexed by Google Images. Do not write "car" or
repeat the listing title.

## Shot list

Twelve frames per car, roughly twenty minutes each once you have a routine.
Shoot every car the same way — consistency across the grid is what makes a
forecourt look like a showroom.

**Exterior (6)**
1. Front three-quarter, wheels turned slightly towards the camera — the hero
2. Rear three-quarter from the opposite side
3. Straight-on side profile
4. Front straight-on
5. Rear straight-on
6. One detail: badge, grille, or wheel

**Interior (5)**
7. Driver's seat and dashboard from the open door
8. Instrument cluster with the ignition on, showing the odometer
9. Rear seats
10. Centre console and infotainment screen
11. Boot, empty and clean

**Documents (1)**
12. Service book and history file, open

### Practical notes

- **Time of day.** Overcast is ideal. In direct sun, shoot early or late; midday
  sun blows out white paint and turns black paint into a mirror of the sky.
- **Background.** Find the plainest wall or shutter you have and use the same one
  every time. A clean background is worth more than an interesting one.
- **Height.** Camera at roughly headlamp height, not eye level. Shooting down at
  a car makes it look small.
- **Distance.** Stand back and zoom in rather than stepping close with a wide
  lens — wide-angle distortion at close range bows the panels.
- **Prepare the car.** Wash it, dress the tyres, clear the interior, and remove
  the trade plates and any forecourt stickers.
- **Number plates.** Either show them consistently or blur them consistently.
  Mixed treatment across the grid looks careless.
- **Phones are fine.** A recent phone in good light beats a DSLR in bad light.
  Shoot in the highest resolution available and do not use portrait mode — the
  fake depth of field smears the car's edges.
