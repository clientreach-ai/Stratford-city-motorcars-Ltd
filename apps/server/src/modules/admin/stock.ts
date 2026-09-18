import { enquiryStatusLabel } from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { NotFoundError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { can } from "@Stratford-city-motorcars-Ltd/core/permissions";
import {
  discardVehicleRefusal,
  statusAfterRestore,
  stockActionRefusal,
  type AdminVehicle,
  type SaveVehicleResult,
  type StockAction,
} from "@Stratford-city-motorcars-Ltd/core/stock";
import type { SessionUser } from "@Stratford-city-motorcars-Ltd/core/team";
import {
  PHOTO_CATEGORIES,
  type PhotoCategory,
  type VehicleImage,
  type VehicleMedia,
  type VehicleRecord,
} from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { isValidSlug, listingRecommendations, publicationIssues } from "@Stratford-city-motorcars-Ltd/core/visibility";
import { eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import { vehicleRecordSchema } from "@Stratford-city-motorcars-Ltd/domain/inventory/schema";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { validate, toValidationError } from "../../lib/validation";
import { getMediaStorage, removeStoredMedia } from "../media/storage";
import { processPhoto } from "../media/photos";
import {
  findVehicle,
  listVehicles,
  withLockedVehicle,
  writeVehicle,
  type Executor,
  type StoredVehicle,
} from "../vehicles/repository";
import { stockChanged } from "../vehicles/service";
import { checkVersion, requireCapability, stamp, type AdminContext, type AdminEnv } from "./context";
import { loadLeads, logActivity, toAdminVehicle } from "./data";

/**
 * Stock — see "Stock" in docs/STRATFORD_ADMIN_CONTRACT.md.
 *
 * Status, reservation, featured and sale change only through their own
 * endpoints; a save keeps them as stored. Every change revalidates the
 * website's stock cache.
 */

const idParam = z.object({ id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/) });
const versioned = z.object({ expectedUpdatedAt: z.string().min(1, "Reload this car and try again.") });

const reserveBody = versioned.extend({
  customerId: z.string().max(64).nullable().default(null),
  customerName: z.string().max(120),
  depositNote: z.string().trim().max(300).optional(),
  note: z.string().trim().max(1000).optional(),
});

const saleBody = versioned.extend({
  soldOn: z.string(),
  salePrice: z.number().int().min(0).max(100_000_000).nullable().default(null),
  customerId: z.string().max(64).nullable().default(null),
  customerName: z.string().trim().max(120).nullable().default(null),
  enquiryId: z.string().max(64).nullable().default(null),
});

const saveBody = versioned.extend({ record: z.record(z.string(), z.unknown()) });

// ---- Helpers ------------------------------------------------------------------------------

async function respond(stored: StoredVehicle, member: SessionUser, executor: Executor = db) {
  const [leads, vehicles] = await Promise.all([loadLeads(executor), listVehicles()]);
  return toAdminVehicle(stored, leads, vehicles, member);
}

async function result(stored: StoredVehicle, member: SessionUser): Promise<SaveVehicleResult> {
  return {
    vehicle: await respond(stored, member),
    issues: publicationIssues(stored.record),
    recommendations: listingRecommendations(stored.record),
  };
}

const notFound = () => new NotFoundError("This car could not be found. It may have been removed.");

/**
 * Refuses a lifecycle action the car's status does not allow (see
 * `STOCK_ACTION_RULES`). Without it "put back on sale" and "take off the
 * website" become back doors into publishing and un-archiving.
 */
function guardStatus(action: StockAction, record: VehicleRecord): void {
  const refusal = stockActionRefusal(action, record.status);
  if (refusal) throw new ValidationError({}, refusal);
}

/**
 * Loads the car with its row locked, checks the version, applies `change`, and
 * saves it with a new `updatedAt`.
 */
async function update(
  c: AdminContext,
  change: (stored: StoredVehicle, member: SessionUser, tx: Executor) => Promise<void> | void,
  capability: "stock.edit" | "stock.archive" = "stock.edit",
): Promise<SaveVehicleResult> {
  const member = requireCapability(c, capability);
  const id = c.req.param("id")!;
  const body = (await c.req.json().catch(() => ({}))) as { expectedUpdatedAt?: string };

  const saved = await withLockedVehicle(id, async (stored, tx) => {
    if (!stored) throw notFound();
    checkVersion(stored.record.updatedAt, body.expectedUpdatedAt);
    await change(stored, member, tx);
    stored.record.updatedAt = stamp(stored.record.updatedAt).toISOString();
    return writeVehicle(stored, tx);
  });
  stockChanged();
  return result(saved, member);
}

function emptyDraft(id: string, slug: string, now: string): StoredVehicle {
  return {
    record: {
      id,
      slug,
      previousSlugs: [],
      status: "draft",
      reserved: false,
      featured: false,
      title: "",
      make: "",
      model: "",
      year: null,
      price: null,
      priceOnApplication: false,
      mileage: null,
      fuel: null,
      transmission: null,
      bodyType: null,
      colour: "",
      motHistory: [],
      hpiStatus: "unknown",
      warranty: { available: null },
      ulezCompliant: null,
      description: "",
      features: [],
      media: [],
      createdAt: now,
      updatedAt: now,
    },
    reservation: null,
    sale: null,
  };
}

/**
 * Keeps stored files as stored: an image or video file is accepted only if its
 * id is already on this car, and its source, size and provenance come from the
 * stored copy. Video and 360° links may be added freely.
 */
function reconcileMedia(stored: VehicleMedia[], submitted: VehicleMedia[]): VehicleMedia[] {
  const known = new Map(stored.map((item) => [item.id, item]));
  return submitted.flatMap((item): VehicleMedia[] => {
    const previous = known.get(item.id);
    if (item.kind === "image") {
      if (previous?.kind !== "image") return [];
      return [{ ...item, src: previous.src, width: previous.width, height: previous.height, provenance: previous.provenance, credit: previous.credit }];
    }
    if (item.kind === "video") {
      const storedVideo = previous?.kind === "video" ? previous : null;
      if (item.source.type === "file") {
        return storedVideo?.source.type === "file" ? [{ ...item, source: storedVideo.source, poster: storedVideo.poster, provenance: storedVideo.provenance }] : [];
      }
      return [{ ...item, poster: storedVideo?.poster, provenance: storedVideo?.provenance ?? "dealer" }];
    }
    return [{ ...item, provenance: previous?.provenance ?? "dealer" }];
  });
}

/** Why this draft cannot simply be deleted (see `discardVehicleRefusal`). */
function discardRefusal(record: VehicleRecord, leads: { vehicleSlug: string | null }[]): string | undefined {
  const slugs = new Set([record.slug, ...record.previousSlugs]);
  const hasEnquiries = leads.some((lead) => lead.vehicleSlug && slugs.has(lead.vehicleSlug));
  return discardVehicleRefusal(record, { hasEnquiries });
}

function storedFiles(media: VehicleMedia[]): string[] {
  return media.flatMap((item) => {
    if (item.kind === "image") return [item.src];
    if (item.kind === "video") {
      return [item.source.type === "file" ? item.source.src : null, item.poster ?? null].filter((src): src is string => !!src);
    }
    return [];
  });
}

/**
 * What to tell the dealership when a field fails the record schema — every
 * field the editor sends, so the schema's own wording ("Too small: expected
 * number to be >=50") never reaches the screen.
 */
const TEXT_MESSAGES: Record<string, string> = {
  title: "Keep the title under 160 characters.",
  make: "Keep the make under 60 characters.",
  model: "Keep the model under 80 characters.",
  variant: "Keep the variant under 120 characters.",
  registration: "Keep the registration under 12 characters.",
  registrationDate: "Choose a real date.",
  colour: "Keep the colour under 80 characters.",
  description: "Keep the description under 6,000 characters.",
  seoTitle: "Search titles are cut off after about 70 characters.",
  seoDescription: "Search descriptions are cut off after about 170 characters.",
  slug: "Use lowercase letters, numbers and single hyphens only.",
  price: "Enter a price in whole pounds.",
  adminFee: "Enter the fee in whole pounds.",
  mileage: "Enter the mileage in whole miles.",
  fuel: "Choose the fuel from the list.",
  transmission: "Choose the gearbox from the list.",
  bodyType: "Choose the body style from the list.",
  interior: "Keep the interior description under 160 characters.",
  engine: "Keep the engine description under 80 characters.",
  engineSizeCc: "Enter the engine size in cc, between 50 and 20,000 — for example 2,981 for a 3.0-litre engine.",
  power: "Keep the power under 40 characters, for example 450 PS.",
  doors: "Enter a number of doors between 1 and 9.",
  seats: "Enter a number of seats between 1 and 12.",
  previousOwners: "Enter a number of previous owners between 0 and 99.",
  insuranceGroup: "Keep the insurance group under 10 characters.",
  roadTaxBand: "Keep the road tax band under 40 characters.",
  serviceHistory: "Keep the service history under 200 characters.",
  motExpiry: "Choose a real date.",
  motHistory: "Check each MOT test: a real date, a result, and the mileage in whole miles.",
  documentation: "Keep the documents note under 300 characters.",
  hpiStatus: "Choose the history check result from the list.",
  warranty: "Enter a warranty term between 1 and 120 months, and keep the note under 300 characters.",
  ulezCompliant: "Choose whether the car is ULEZ compliant.",
  financeExample: "Check the finance example: every figure is needed.",
};

function friendlyFields(fields: Record<string, string>, record: Partial<VehicleRecord>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields)) {
    const [head, index] = path.split(".");
    if (head === "media" && index !== undefined) {
      const id = record.media?.[Number(index)]?.id;
      out[id ? `media.${id}` : "media"] = message;
    } else if (head === "features") {
      out.features = "Keep each feature under 80 characters.";
    } else if (head === "year") {
      out.year = `Enter a year between 1886 and ${new Date().getFullYear() + 1}.`;
    } else {
      // Never the schema's own wording: it reads like code to the dealership.
      out[head!] ??= TEXT_MESSAGES[head!] ?? (message.includes("expected") ? "Check this value and try again." : message);
    }
  }
  return out;
}

// ---- Routes -----------------------------------------------------------------------------------

export const stockRoutes = new Hono<AdminEnv>()
  .get("/", async (c) => {
    const member = c.get("member");
    const [vehicles, leads] = await Promise.all([listVehicles(), loadLeads()]);
    return c.json(vehicles.map((stored) => toAdminVehicle(stored, leads, vehicles, member)) satisfies AdminVehicle[]);
  })

  .get("/:id", validate("param", idParam), async (c) => {
    const stored = await findVehicle(c.req.valid("param").id);
    if (!stored) throw notFound();
    return c.json(await respond(stored, c.get("member")));
  })

  .post("/", async (c) => {
    const member = requireCapability(c, "stock.edit");
    const id = crypto.randomUUID();
    const saved = await writeVehicle(emptyDraft(id, `new-car-${id.slice(0, 8)}`, new Date().toISOString()));
    stockChanged();
    return c.json(await respond(saved, member), 201);
  })

  .put("/:id", validate("param", idParam), validate("json", saveBody), async (c) => {
    const member = requireCapability(c, "stock.edit");
    const { id } = c.req.valid("param");
    const { record: input, expectedUpdatedAt } = c.req.valid("json");
    let removedFiles: string[] = [];

    const saved = await withLockedVehicle(id, async (stored, tx) => {
      if (!stored) throw notFound();
      checkVersion(stored.record.updatedAt, expectedUpdatedAt);
      guardStatus("edit", stored.record);

      const parsed = vehicleRecordSchema.safeParse({ ...input, id, createdAt: stored.record.createdAt, updatedAt: stored.record.updatedAt });
      if (!parsed.success) {
        const error = toValidationError(parsed.error);
        throw new ValidationError(friendlyFields(error.fields, input as Partial<VehicleRecord>));
      }
      const record = parsed.data as VehicleRecord;
      if (!isValidSlug(record.slug)) throw new ValidationError({ slug: TEXT_MESSAGES.slug! });

      const others = (await listVehicles()).filter((item) => item.record.id !== id);
      if (others.some((item) => item.record.slug === record.slug || item.record.previousSlugs.includes(record.slug))) {
        throw new ValidationError({ slug: "Another car already uses (or used) this web address." });
      }

      const media = reconcileMedia(stored.record.media, record.media);
      const kept = new Set(storedFiles(media));
      removedFiles = storedFiles(stored.record.media).filter((src) => !kept.has(src));

      const current = stored.record;
      const previousSlugs =
        record.slug !== current.slug && current.listedAt && !current.previousSlugs.includes(current.slug)
          ? [...current.previousSlugs, current.slug]
          : current.previousSlugs;

      const next: VehicleRecord = {
        ...record,
        media,
        coverImageId: media.some((item) => item.id === record.coverImageId) ? record.coverImageId : undefined,
        // Status, lifecycle and history change only through their own actions.
        status: current.status,
        reserved: current.reserved,
        featured: current.featured,
        listedAt: current.listedAt,
        soldAt: current.soldAt,
        createdAt: current.createdAt,
        previousSlugs: previousSlugs.filter((slug) => slug !== record.slug),
        updatedAt: stamp(current.updatedAt).toISOString(),
      };
      return writeVehicle({ ...stored, record: next }, tx);
    });

    stockChanged();
    await removeStoredMedia(removedFiles);
    return c.json(await result(saved, member));
  })

  .post("/:id/publish", validate("param", idParam), async (c) =>
    c.json(
      await update(c, (stored) => {
        const record = stored.record;
        guardStatus("publish", record);
        const issues = publicationIssues(record);
        if (issues.length) throw new ValidationError({}, "This car cannot go on the website yet.", issues);
        record.status = "published";
        record.listedAt ??= new Date().toISOString();
      }),
    ),
  )

  .post("/:id/unpublish", validate("param", idParam), async (c) =>
    c.json(
      await update(c, (stored) => {
        guardStatus("unpublish", stored.record);
        stored.record.status = "draft";
        stored.record.featured = false;
      }),
    ),
  )

  .post("/:id/featured", validate("param", idParam), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { featured?: unknown };
    if (typeof body.featured !== "boolean") {
      throw new ValidationError({ featured: "Say whether this car should be featured." });
    }
    const featured = body.featured;
    return c.json(
      await update(c, (stored) => {
        if (featured && stored.record.status !== "published") {
          throw new ValidationError({}, "Only cars for sale can be featured on the homepage.");
        }
        stored.record.featured = featured;
      }),
    );
  })

  .post("/:id/reservation", validate("param", idParam), validate("json", reserveBody), async (c) => {
    const input = c.req.valid("json");
    return c.json(
      await update(c, (stored) => {
        if (stored.record.status !== "published") throw new ValidationError({}, "Only cars for sale can be reserved.");
        const customerName = input.customerName.trim();
        if (!customerName) throw new ValidationError({ customerName: "Add who the car is reserved for." });
        stored.record.reserved = true;
        stored.reservation = {
          customerId: input.customerId,
          customerName,
          reservedAt: new Date().toISOString(),
          depositNote: input.depositNote || undefined,
          note: input.note || undefined,
        };
      }),
    );
  })

  .delete("/:id/reservation", validate("param", idParam), async (c) =>
    c.json(
      await update(c, (stored) => {
        stored.record.reserved = false;
        stored.reservation = null;
      }),
    ),
  )

  .post("/:id/sale", validate("param", idParam), validate("json", saleBody), async (c) => {
    const input = c.req.valid("json");
    return c.json(
      await update(c, async (stored, member, tx) => {
        const record = stored.record;
        if (record.status !== "published") throw new ValidationError({}, "Only cars for sale can be marked sold.");
        // A real calendar day: "2026-02-31" parses but rolls over to March.
        const day = new Date(`${input.soldOn}T12:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(input.soldOn) ||
          Number.isNaN(day.getTime()) ||
          day.toISOString().slice(0, 10) !== input.soldOn ||
          day.getTime() > Date.now()
        ) {
          throw new ValidationError({ soldOn: "Choose today or an earlier date." });
        }
        const soldAt = new Date(`${input.soldOn}T12:00:00Z`).toISOString();
        record.status = "sold";
        record.soldAt = soldAt;
        record.listedAt ??= soldAt;
        record.reserved = false;
        record.featured = false;
        stored.reservation = null;
        stored.sale = {
          soldAt,
          salePrice: can(member.role, "stock.salePrice") ? input.salePrice : null,
          customerId: input.customerId,
          customerName: input.customerName || null,
          enquiryId: input.enquiryId,
        };

        if (input.enquiryId) {
          const [enquiry] = await tx.select().from(tables.lead).where(eq(tables.lead.id, input.enquiryId)).limit(1);
          if (enquiry && enquiry.status !== "sold") {
            await logActivity(
              tx,
              enquiry.id,
              member,
              "status",
              `Status changed from ${enquiryStatusLabel(enquiry.status as never)} to Sold (${record.title}).`,
            );
            await tx
              .update(tables.lead)
              .set({ status: "sold", closedReason: null, updatedAt: stamp(enquiry.updatedAt), firstRepliedAt: enquiry.firstRepliedAt ?? new Date() })
              .where(eq(tables.lead.id, enquiry.id));
          }
        }
      }),
    );
  })

  .delete("/:id/sale", validate("param", idParam), async (c) =>
    c.json(
      await update(c, (stored) => {
        guardStatus("undoSale", stored.record);
        stored.record.status = "published";
        stored.record.soldAt = undefined;
        stored.sale = null;
      }),
    ),
  )

  .post("/:id/archive", validate("param", idParam), async (c) =>
    c.json(
      await update(
        c,
        (stored) => {
          guardStatus("archive", stored.record);
          stored.record.status = "archived";
          stored.record.featured = false;
          stored.record.reserved = false;
          stored.reservation = null;
        },
        "stock.archive",
      ),
    ),
  )

  .post("/:id/restore", validate("param", idParam), async (c) =>
    c.json(
      await update(
        c,
        (stored) => {
          guardStatus("restore", stored.record);
          // A car archived while sold goes back to sold, so its sale survives.
          stored.record.status = statusAfterRestore(Boolean(stored.sale));
        },
        "stock.archive",
      ),
    ),
  )

  .post("/:id/duplicate", validate("param", idParam), async (c) => {
    const member = requireCapability(c, "stock.edit");
    const source = await findVehicle(c.req.valid("param").id);
    if (!source) throw notFound();

    const vehicles = await listVehicles();
    const taken = (slug: string) => vehicles.some((item) => item.record.slug === slug || item.record.previousSlugs.includes(slug));
    const base = `${source.record.slug}`.slice(0, 100);
    let slug = `${base}-copy`;
    for (let n = 2; taken(slug); n += 1) slug = `${base}-copy-${n}`;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const copy: StoredVehicle = {
      record: {
        ...structuredClone(source.record),
        id,
        slug,
        previousSlugs: [],
        title: `${source.record.title} (copy)`.slice(0, 160),
        status: "draft",
        reserved: false,
        featured: false,
        registration: undefined,
        media: [],
        coverImageId: undefined,
        motHistory: [],
        createdAt: now,
        updatedAt: now,
        listedAt: undefined,
        soldAt: undefined,
      },
      reservation: null,
      sale: null,
    };
    const saved = await writeVehicle(copy);
    stockChanged();
    return c.json(await respond(saved, member), 201);
  })

  /**
   * Discards a draft that never reached the website, with its photographs.
   * Opening "Add a car" creates a record straight away, so without this every
   * abandoned start stays in the stock list for good. Anything with a history
   * — listed once, or asked about — is archived instead, never deleted.
   */
  .delete("/:id", validate("param", idParam), async (c) => {
    requireCapability(c, "stock.edit");
    const { id } = c.req.valid("param");
    const body = (await c.req.json().catch(() => ({}))) as { expectedUpdatedAt?: string };

    const stored = await findVehicle(id);
    if (!stored) throw notFound();
    checkVersion(stored.record.updatedAt, body.expectedUpdatedAt);

    const reason = discardRefusal(stored.record, await loadLeads());
    if (reason) throw new ValidationError({}, reason);

    const files = storedFiles(stored.record.media);
    await db.delete(tables.vehicle).where(eq(tables.vehicle.id, id));
    stockChanged();
    await removeStoredMedia(files);
    return c.body(null, 204);
  })

  .post("/:id/media", validate("param", idParam), async (c) => {
    requireCapability(c, "stock.edit");
    const { id } = c.req.valid("param");
    const storage = getMediaStorage();
    if (!storage) throw new ValidationError({ file: "Photo storage is not set up on the server yet." }, "Photos cannot be uploaded yet.");
    const target = await findVehicle(id);
    if (!target) throw notFound();
    guardStatus("edit", target.record);

    const form = await c.req.parseBody();
    const file = form.file;
    const category = String(form.category ?? "");
    const alt = String(form.alt ?? "").trim().slice(0, 250);
    if (!(file instanceof File)) throw new ValidationError({ file: "Choose a photograph to upload." });
    if (!(PHOTO_CATEGORIES as readonly string[]).includes(category)) {
      throw new ValidationError({ category: "Choose what the photograph shows." });
    }

    const photo = await processPhoto(file);
    const src = await storage.put(id, "webp", photo.bytes, "image/webp");
    const image: VehicleImage = {
      id: `m-${crypto.randomUUID()}`,
      kind: "image",
      src,
      width: photo.width,
      height: photo.height,
      alt,
      category: category as PhotoCategory,
      provenance: "dealer",
    };

    // Attached at once WITHOUT a new version, so an open editor can still save
    // and a photo taken on a phone is never lost (see the contract).
    try {
      await withLockedVehicle(id, async (stored, tx) => {
        if (!stored) throw notFound();
        stored.record.media = [...stored.record.media, image];
        await writeVehicle(stored, tx);
      });
    } catch (error) {
      await removeStoredMedia([src]);
      throw error;
    }
    stockChanged();
    return c.json(image satisfies VehicleImage, 201);
  });
