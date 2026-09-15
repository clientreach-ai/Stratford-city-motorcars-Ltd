# Vehicle photography and media

Photographs of the actual cars are the single highest-value thing this website
needs. The client wants **20+ photographs per car, interiors always, detail
shots, and a short walkaround video on every listing**, with 360° spins if they
are not expensive. Until a car is photographed it stays hidden.

## Where things stand

- **No car has photography yet.** The previous site's inventory returned
  `"images": []` for every vehicle. The client has "quick phone snaps, not
  sellable" of some cars.
- **A car cannot be published without the dealership's own photographs.** The
  publishing rules (`src/lib/inventory/visibility.ts`) require at least one
  dealer **exterior** and one dealer **interior** photograph. That is the
  technical minimum, not the standard: the dashboard shows the 20+ target, detail
  shots and walkaround video as a checklist on every car.
- **Stock and library photographs never appear publicly.** Media is marked
  `dealer` or `library`. Library media (a correctly identified photo of the same
  model, like the CC0 Rolls-Royce Dawn image kept in the seed data) never counts
  towards publishing, can never be the cover, and is stripped from everything
  the public site renders.

## Adding photographs and video

Use the dashboard: **Inventory → the car → Media**.

1. **Upload photographs.** JPEG, PNG, WebP or AVIF, at least 800px on the long
   side, up to 25 MB each. iPhone photos upload as JPEG from the browser.
2. **Classify every photograph** as exterior, interior, detail or documents.
   The publishing checklist counts exterior and interior.
3. **Write the alt text** — describe the car and the angle ("2016 Mercedes-Benz
   SL63 AMG in obsidian black, front three-quarter view"). Screen readers read it
   aloud and Google Images indexes it. Don't write "car" or repeat the title.
4. **Order them and choose the cover.** The cover is the card thumbnail, the
   social share image and the first thing a buyer sees; make it the best
   front three-quarter exterior. Without a choice, the first exterior is used.
5. **Add the walkaround video** — upload an MP4 (up to 200 MB), or paste an
   unlisted YouTube or Vimeo link, which keeps large files off the website.
6. **360° spin** — paste the link from whichever spin service is used; it opens
   in a new tab.

### What happens to an upload

Every photograph is processed once, on upload:

- rotated the right way up from its EXIF orientation, then **all metadata is
  removed** — phone photos carry GPS coordinates and device details that must
  never be published;
- scaled to at most **2560px** on the long edge (sharper than any screen needs,
  a fraction of a 12-megapixel original);
- stored as **WebP** at quality 82, with its final pixel size recorded so pages
  reserve the right space and nothing jumps as it loads.

The site never serves the stored master to a browser directly in a gallery.
The Next.js image optimiser produces each size a layout needs — phone gallery,
desktop gallery, card, thumbnail, full-screen viewer — as AVIF or WebP, caches
it, and the page's `sizes` tell the browser which one to fetch. Only the first
gallery photograph loads immediately with high priority; every other photograph
and thumbnail waits until it is about to scroll into view, and the full-screen
viewer requests its image only when opened.

Videos are stored exactly as uploaded (the site does not transcode) and use the
native player with `preload="none"`, so nothing downloads until a buyer presses
play. YouTube and Vimeo players are loaded only on click.

### Where files are kept

Uploads are stored by `src/lib/media/storage.ts`. The built implementation
writes to the server's disk under `MEDIA_ROOT` (default `apps/web/.data/media`)
and serves files from `/media/…` with year-long immutable caching and range
requests for video. That suits development and a single server with a
persistent disk. On serverless hosting the disk is not persistent, so production
there needs object storage (for example Cloudflare R2 or S3 behind a CDN) —
see the integration notes in that file.

## Shot list

Aim for twenty-plus frames per car, shot the same way every time — consistency
across the grid is what makes a forecourt look like a showroom.

#### Exterior

1. Front three-quarter, wheels turned slightly towards the camera — the cover
2. Rear three-quarter from the opposite side
3. Straight-on side profile, both sides
4. Front straight-on
5. Rear straight-on
6. Roof down and roof up, for convertibles

#### Interior (always)

7. Driver's seat and dashboard from the open door
8. Instrument cluster with the ignition on, showing the odometer
9. Passenger side and rear seats
10. Centre console and infotainment screen
11. Headlining, door cards, boot (empty and clean)

#### Detail

12. Wheels and brake calipers
13. Badges, grille, lights
14. Stitching, trim inlays, dials
15. Any wear or marks, honestly shown

#### Documents

16. Service book and history file, open
17. V5C (with personal details covered) and the keys

**Walkaround video** — 30 to 90 seconds, landscape, a slow loop of the car and
a pass through the interior with the engine running. Record in 1080p; on an
iPhone set *Formats → Most Compatible* so the file plays in every browser.

### Practical notes

- **Location.** The client's forecourt and the roads around it are not good
  places to shoot. Use one plain, quiet location nearby and return to it.
- **Time of day.** Overcast is ideal. In direct sun, shoot early or late; midday
  sun blows out white paint and turns black paint into a mirror of the sky.
- **Height and distance.** Camera at roughly headlamp height, and stand back and
  zoom in rather than stepping close with a wide lens, which bows the panels.
- **Prepare the car.** Wash it, dress the tyres, clear the interior, remove
  trade plates and forecourt stickers.
- **Number plates.** Either show them consistently or blur them consistently.
- **Phones are fine.** A recent phone in good light beats a DSLR in bad light.
  Shoot at full resolution and never use portrait mode — the fake depth of field
  smears the car's edges.
