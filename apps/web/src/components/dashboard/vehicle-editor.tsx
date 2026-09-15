"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, CircleDashed, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { MediaManager, type UploadOutcome } from "@/components/dashboard/media-manager";
import { StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  addVehicleSpinLink,
  addVehicleVideoLink,
  archiveVehicle,
  duplicateVehicle,
  markVehicleSold,
  publishVehicle,
  restoreVehicle,
  saveVehicle,
  setVehicleFeatured,
  unpublishVehicle,
  updateVehicleMedia,
  type ActionResult,
} from "@/lib/dashboard/actions";
import { fromEditorValues, suggestSlug, toEditorValues, type EditorValues } from "@/lib/dashboard/editor-values";
import {
  BODY_TYPES,
  FUEL_TYPES,
  HPI_STATUSES,
  TRANSMISSIONS,
  type PhotoCategory,
  type VehicleMedia,
  type VehicleRecord,
} from "@/lib/inventory/types";
import { isPubliclyVisible, listingRecommendations, publicationIssues, PUBLIC_PRICE_RANGE } from "@/lib/inventory/visibility";

const SECTIONS = [
  { id: "identity", label: "The car" },
  { id: "price", label: "Price" },
  { id: "specification", label: "Specification" },
  { id: "history", label: "History & checks" },
  { id: "description", label: "Description" },
  { id: "media", label: "Photos & video" },
  { id: "seo", label: "Search" },
] as const;

const HPI_LABEL = { clear: "Clear", "not-checked": "Not checked", unknown: "Not set — the website says “ask us”" } as const;

type Flash = { tone: "success" | "error" | "info"; text: string } | null;

/**
 * The vehicle editor. Written for someone who is not a developer: every field
 * is named in plain English, anything that stops a car being published is
 * listed with a link to fix it, and nothing destructive happens without asking.
 */
export function VehicleEditor({
  initialRecord,
  publicUrl,
  initialFlash,
}: {
  initialRecord: VehicleRecord;
  publicUrl: string;
  initialFlash?: Flash;
}) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [baseline, setBaseline] = useState(() => toEditorValues(initialRecord));
  const [values, setValues] = useState(baseline);
  const [media, setMedia] = useState<VehicleMedia[]>(initialRecord.media);
  const [mediaBaseline, setMediaBaseline] = useState(() => mediaSignature(initialRecord.media, initialRecord.coverImageId));
  const [coverId, setCoverId] = useState(initialRecord.coverImageId);
  const [removed, setRemoved] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<Flash>(initialFlash ?? null);
  const [pending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(!initialRecord.slug.startsWith("new-car-"));

  const detailsDirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const mediaDirty = removed.length > 0 || mediaSignature(media, coverId) !== mediaBaseline;
  const dirty = detailsDirty || mediaDirty;

  // What the car would look like if saved now — drives the live checklist.
  const draft = useMemo<VehicleRecord>(
    () => ({ ...record, ...fromEditorValues(values), media: media.filter((item) => !removed.includes(item.id)), coverImageId: coverId }),
    [record, values, media, removed, coverId],
  );
  const issues = publicationIssues(draft);
  const recommendations = listingRecommendations(draft);
  const liveNow = isPubliclyVisible(record);
  const name = [values.year, values.title || [values.make, values.model].filter(Boolean).join(" ")].filter(Boolean).join(" ") || "Untitled car";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof EditorValues>(key: K, value: EditorValues[K]) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (!slugTouched && (key === "year" || key === "make" || key === "model" || key === "variant")) {
        const suggestion = suggestSlug(next);
        if (suggestion) next.slug = suggestion;
      }
      return next;
    });
  };

  function adopt(result: Extract<ActionResult, { ok: true }>, keepLocalEdits: boolean) {
    setRecord(result.record);
    const saved = toEditorValues(result.record);
    setBaseline(saved);
    if (!keepLocalEdits) setValues(saved);
  }

  function adoptMedia(next: VehicleRecord) {
    setMedia(next.media);
    setCoverId(next.coverImageId);
    setRemoved([]);
    setMediaBaseline(mediaSignature(next.media, next.coverImageId));
  }

  /** Saves media changes and details together; returns the saved record or null. */
  async function saveAll(): Promise<VehicleRecord | null> {
    let current = record;
    if (mediaDirty) {
      const result = await updateVehicleMedia(record.id, {
        order: media.map((item) => item.id),
        updates: media.map((item) => (item.kind === "image" ? { id: item.id, category: item.category, alt: item.alt } : { id: item.id, title: item.title })),
        coverImageId: coverId ?? null,
        removed,
      });
      if (!result.ok) {
        setFlash({ tone: "error", text: result.message });
        return null;
      }
      current = result.record;
      adoptMedia(result.record);
      setRecord(result.record);
    }
    if (detailsDirty || !mediaDirty) {
      const result = await saveVehicle(record.id, current.updatedAt, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFlash({ tone: "error", text: result.message });
        return null;
      }
      setErrors({});
      adopt(result, false);
      current = result.record;
    }
    setFlash({ tone: "success", text: "Saved." });
    return current;
  }

  function run(label: string, action: () => Promise<ActionResult>, options: { saveFirst?: boolean } = {}) {
    startTransition(async () => {
      if (options.saveFirst && dirty) {
        const saved = await saveAll();
        if (!saved) return;
      }
      const result = await action();
      if (result.ok) {
        adopt(result, true);
        setFlash({ tone: "success", text: result.message ?? `${label} done.` });
      } else {
        setFlash({ tone: "error", text: result.message });
      }
      router.refresh();
    });
  }

  async function uploadFiles(files: File[], category: PhotoCategory, onProgress: (fraction: number) => void): Promise<UploadOutcome> {
    if (mediaDirty) {
      const saved = await saveAll();
      if (!saved) return { ok: false, message: "Save or undo your photo changes, then upload again.", added: [], failures: [] };
    }
    const body = new FormData();
    body.set("vehicleId", record.id);
    body.set("category", category);
    for (const file of files) body.append("files", file);

    const response = await new Promise<{ status: number; json: unknown }>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/dashboard/media");
      request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
      request.onload = () => {
        let json: unknown = null;
        try {
          json = JSON.parse(request.responseText);
        } catch {
          json = null;
        }
        resolve({ status: request.status, json });
      };
      request.onerror = () => resolve({ status: 0, json: null });
      request.send(body);
    });

    const data = response.json as { ok?: boolean; message?: string; record?: VehicleRecord; failures?: UploadOutcome["failures"] } | null;
    if (data?.record) {
      const before = new Set(media.map((item) => item.id));
      const added = data.record.media.filter((item) => !before.has(item.id));
      setRecord(data.record);
      setBaseline(toEditorValues(data.record));
      adoptMedia(data.record);
      router.refresh();
      return { ok: Boolean(data.ok), message: data.message ?? "Uploaded.", added, failures: data.failures ?? [] };
    }
    return {
      ok: false,
      message: response.status === 401 ? "Your session has ended. Sign in again, then retry." : (data?.message ?? "The upload didn't go through. Check your connection and try again."),
      added: [],
      failures: data?.failures ?? [],
    };
  }

  async function addLink(kind: "video" | "spin", link: string, title: string): Promise<string | null> {
    if (dirty) {
      const saved = await saveAll();
      if (!saved) return "Save your other changes first.";
    }
    const result = kind === "video" ? await addVehicleVideoLink(record.id, link, title) : await addVehicleSpinLink(record.id, link, title);
    if (!result.ok) return result.fieldErrors?.videoLink ?? result.fieldErrors?.spinLink ?? result.message;
    adopt(result, true);
    adoptMedia(result.record);
    setFlash({ tone: "success", text: result.message ?? "Added." });
    return null;
  }

  const error = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="mt-1.5 text-xs text-danger">
        {errors[key]}
      </p>
    ) : null;

  const text = (key: keyof EditorValues, label: string, options: { hint?: string; type?: string; inputMode?: "numeric" | "decimal" | "text"; required?: boolean; placeholder?: string; className?: string } = {}) => (
    <div className={options.className}>
      <Label htmlFor={key} required={options.required}>
        {label}
      </Label>
      <Input
        id={key}
        type={options.type ?? "text"}
        inputMode={options.inputMode}
        value={values[key] as string}
        placeholder={options.placeholder}
        onChange={(event) => set(key, event.target.value as never)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={[options.hint ? `${key}-hint` : "", errors[key] ? `${key}-error` : ""].filter(Boolean).join(" ") || undefined}
        className="mt-1.5 h-11 text-sm"
      />
      {options.hint ? (
        <p id={`${key}-hint`} className="mt-1.5 text-xs text-[var(--muted-foreground)]">
          {options.hint}
        </p>
      ) : null}
      {error(key)}
    </div>
  );

  const choice = <K extends keyof EditorValues>(key: K, label: string, choices: readonly { value: string; label: string }[], required = false) => (
    <div>
      <Label htmlFor={key} required={required}>
        {label}
      </Label>
      <Select id={key} value={values[key] as string} onChange={(event) => set(key, event.target.value as EditorValues[K])} className="mt-1.5 h-11 text-sm">
        {choices.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {error(key)}
    </div>
  );

  const options = (list: readonly string[], empty: string) => [{ value: "", label: empty }, ...list.map((value) => ({ value, label: value }))];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <nav aria-label="Editor sections" className="flex flex-wrap gap-1 text-sm">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#section-${section.id}`} className="inline-flex min-h-11 items-center border border-[var(--border)] bg-[var(--background)] px-3 hover:border-[var(--border-strong)]">
              {section.label}
            </a>
          ))}
        </nav>

        {flash ? (
          <div
            role={flash.tone === "error" ? "alert" : "status"}
            className={cn(
              "border px-4 py-3 text-sm",
              flash.tone === "success" && "border-success/40 bg-success/5",
              flash.tone === "error" && "border-danger/40 bg-danger/5",
              flash.tone === "info" && "border-[var(--border-strong)] bg-[var(--background)]",
            )}
          >
            {flash.text}
          </div>
        ) : null}

        <EditorSection id="identity" title="The car">
          <div className="grid gap-5 md:grid-cols-2">
            {text("title", "Listing title", { hint: "How the car is named on the website, e.g. Aston Martin Vantage.", required: true, className: "md:col-span-2" })}
            {text("make", "Make", { required: true })}
            {text("model", "Model", { required: true })}
            {text("variant", "Variant", { hint: "Optional, e.g. 4.0 V8 2dr." })}
            {text("year", "Year", { inputMode: "numeric", required: true })}
            {text("registration", "Registration", { hint: "Shown on the car's page." })}
            {text("registrationDate", "First registered", { type: "date" })}
            <div className="md:col-span-2">
              <Label htmlFor="slug" required>
                Web address
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="hidden text-sm text-[var(--muted-foreground)] sm:block">/vehicles/</span>
                <Input
                  id="slug"
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    set("slug", event.target.value.toLowerCase());
                  }}
                  aria-invalid={errors.slug ? true : undefined}
                  aria-describedby="slug-hint"
                  className="h-11 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => {
                    const suggestion = suggestSlug(values);
                    if (suggestion) set("slug", suggestion);
                  }}
                >
                  Suggest
                </Button>
              </div>
              <p id="slug-hint" className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                Lowercase letters, numbers and hyphens. Once a car has been on the website, its old address keeps working if you change this.
              </p>
              {error("slug")}
            </div>
          </div>
        </EditorSection>

        <EditorSection id="price" title="Price">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm md:col-span-2">
              <Checkbox checked={values.priceOnApplication} onChange={(event) => set("priceOnApplication", event.target.checked)} />
              Price on application (POA) — for cars whose value changes, like rare classics
            </label>
            {values.priceOnApplication ? null : text("price", "Cash price (£)", {
              inputMode: "numeric",
              required: true,
              hint: `Whole pounds, no £ sign. The website lists cars from £${PUBLIC_PRICE_RANGE.min.toLocaleString("en-GB")} to £${PUBLIC_PRICE_RANGE.max.toLocaleString("en-GB")}.`,
            })}
            {text("adminFee", "Admin, documentation or delivery fee (£)", { inputMode: "numeric", hint: "Only if one applies to this car. Shown next to the price." })}
            <label className={cn("flex min-h-11 items-center gap-3 text-sm md:col-span-2", record.status !== "published" && "opacity-60")}>
              <Checkbox
                checked={values.reserved}
                disabled={record.status !== "published"}
                onChange={(event) => set("reserved", event.target.checked)}
              />
              Reserved — being held for a buyer {record.status !== "published" ? "(only for published cars)" : ""}
            </label>
          </div>

          <details className="mt-6 border border-[var(--border)]">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">Finance example (monthly figure)</summary>
            <div className="border-t border-[var(--border)] p-4">
              <p className="mb-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
                A monthly figure is only shown on the website once your lender and FCA wording are set up with whoever manages the
                website. Fill in every figure from the lender&rsquo;s representative example, or leave all of them blank.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="finance-product">Product</Label>
                  <Select
                    id="finance-product"
                    value={values.finance.product}
                    onChange={(event) => set("finance", { ...values.finance, product: event.target.value as EditorValues["finance"]["product"] })}
                    className="mt-1.5 h-11 text-sm"
                  >
                    <option value="">Not set</option>
                    <option value="HP">Hire Purchase (HP)</option>
                    <option value="PCP">Personal Contract Purchase (PCP)</option>
                  </Select>
                  {error("financeExample.product")}
                </div>
                {(
                  [
                    ["lender", "Lender"],
                    ["monthlyPayment", "Monthly payment (£)"],
                    ["termMonths", "Term (months)"],
                    ["deposit", "Deposit (£)"],
                    ["apr", "Representative APR (%)"],
                    ["fixedRate", "Fixed rate (%)"],
                    ["totalCredit", "Total credit (£)"],
                    ["totalAmountPayable", "Total amount payable (£)"],
                    ["optionalFinalPayment", "Optional final payment (£, PCP)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={`finance-${key}`}>{label}</Label>
                    <Input
                      id={`finance-${key}`}
                      inputMode={key === "lender" ? "text" : "decimal"}
                      value={values.finance[key]}
                      onChange={(event) => set("finance", { ...values.finance, [key]: event.target.value })}
                      aria-invalid={errors[`financeExample.${key}`] ? true : undefined}
                      className="mt-1.5 h-11 text-sm"
                    />
                    {error(`financeExample.${key}`)}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </EditorSection>

        <EditorSection id="specification" title="Specification">
          <div className="grid gap-5 md:grid-cols-2">
            {text("mileage", "Mileage", { inputMode: "numeric", required: true })}
            {choice("transmission", "Gearbox", options(TRANSMISSIONS, "Choose…"), true)}
            {choice("fuel", "Fuel", options(FUEL_TYPES, "Choose…"), true)}
            {choice("bodyType", "Body style", options(BODY_TYPES, "Choose…"), true)}
            {text("colour", "Colour", { required: true, placeholder: "As you'd describe it, e.g. Obsidian Black" })}
            {text("engineSizeCc", "Engine size (cc)", { inputMode: "numeric", placeholder: "e.g. 3982" })}
            {text("engine", "Engine", { placeholder: "e.g. 4.0L Twin-Turbo V8" })}
            {text("power", "Power", { placeholder: "e.g. 503 bhp" })}
            {text("previousOwners", "Previous owners", { inputMode: "numeric" })}
            {text("interior", "Interior", { placeholder: "e.g. Red leather" })}
            {text("insuranceGroup", "Insurance group", { placeholder: "e.g. 50E" })}
            {text("roadTaxBand", "Road tax band", { placeholder: "e.g. M, or £620 a year" })}
            {text("doors", "Doors", { inputMode: "numeric" })}
            {text("seats", "Seats", { inputMode: "numeric" })}
          </div>
        </EditorSection>

        <EditorSection id="history" title="History & checks">
          <div className="grid gap-5 md:grid-cols-2">
            {text("serviceHistory", "Service history", { placeholder: "e.g. Full main dealer history", className: "md:col-span-2" })}
            {text("motExpiry", "MOT expiry", { type: "date" })}
            {choice("hpiStatus", "History check (HPI)", HPI_STATUSES.map((value) => ({ value, label: HPI_LABEL[value] })))}
            {text("documentation", "V5C and documents", { placeholder: "e.g. V5C present, two keys, history file", className: "md:col-span-2" })}
            {choice("warrantyAvailable", "Warranty", [
              { value: "unknown", label: "Not set — the website says “ask us”" },
              { value: "yes", label: "Third-party warranty available" },
              { value: "no", label: "Not available on this car" },
            ])}
            {values.warrantyAvailable === "yes" ? text("warrantyTermMonths", "Longest warranty term (months)", { inputMode: "numeric" }) : <div />}
            {choice("ulez", "ULEZ", [
              { value: "unknown", label: "Not confirmed — the website says we'll confirm" },
              { value: "yes", label: "Compliant (confirmed)" },
              { value: "no", label: "Not compliant (confirmed)" },
            ])}
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            The website always says warranty is sold separately and not included in the price.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">MOT history</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("motHistory", [...values.motHistory, { date: "", result: "pass", mileage: "", notes: "" }])}
              >
                <Plus className="size-4" /> Add test
              </Button>
            </div>
            {error("motHistory")}
            {values.motHistory.length ? (
              <ul className="mt-3 space-y-3">
                {values.motHistory.map((row, index) => (
                  <li key={index} className="grid gap-3 border border-[var(--border)] p-3 sm:grid-cols-[9.5rem_7rem_7.5rem_1fr_auto] sm:items-end">
                    <div>
                      <Label htmlFor={`mot-${index}-date`}>Date</Label>
                      <Input
                        id={`mot-${index}-date`}
                        type="date"
                        value={row.date}
                        onChange={(event) => set("motHistory", values.motHistory.map((entry, i) => (i === index ? { ...entry, date: event.target.value } : entry)))}
                        className="mt-1 h-11 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`mot-${index}-result`}>Result</Label>
                      <Select
                        id={`mot-${index}-result`}
                        value={row.result}
                        onChange={(event) => set("motHistory", values.motHistory.map((entry, i) => (i === index ? { ...entry, result: event.target.value as "pass" | "fail" } : entry)))}
                        className="mt-1 h-11 text-sm"
                      >
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`mot-${index}-mileage`}>Mileage</Label>
                      <Input
                        id={`mot-${index}-mileage`}
                        inputMode="numeric"
                        value={row.mileage}
                        onChange={(event) => set("motHistory", values.motHistory.map((entry, i) => (i === index ? { ...entry, mileage: event.target.value } : entry)))}
                        className="mt-1 h-11 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`mot-${index}-notes`}>Advisories or notes</Label>
                      <Input
                        id={`mot-${index}-notes`}
                        value={row.notes}
                        onChange={(event) => set("motHistory", values.motHistory.map((entry, i) => (i === index ? { ...entry, notes: event.target.value } : entry)))}
                        className="mt-1 h-11 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove MOT test ${index + 1}`}
                      onClick={() => set("motHistory", values.motHistory.filter((_, i) => i !== index))}
                      className="flex size-11 items-center justify-center border border-[var(--border-strong)] text-danger hover:border-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">No MOT tests added. The website says “ask us” until you add them.</p>
            )}
          </div>
        </EditorSection>

        <EditorSection id="description" title="Description">
          <div className="space-y-5">
            <div>
              <Label htmlFor="description" required>
                Description
              </Label>
              <Textarea
                id="description"
                rows={9}
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby="description-hint"
                className="mt-1.5 text-sm"
              />
              <p id="description-hint" className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                Leave a blank line between paragraphs. If you draft with ChatGPT, check every fact — the website only says what is true
                of this car.
              </p>
              {error("description")}
            </div>
            <div>
              <Label htmlFor="features">Key features</Label>
              <Textarea
                id="features"
                rows={6}
                value={values.features}
                onChange={(event) => set("features", event.target.value)}
                aria-describedby="features-hint"
                className="mt-1.5 text-sm"
              />
              <p id="features-hint" className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                One per line, e.g. Heated seats.
              </p>
              {error("features")}
            </div>
          </div>
        </EditorSection>

        <EditorSection id="media" title="Photos & video">
          <MediaManager
            vehicleName={name}
            media={media.filter((item) => !removed.includes(item.id))}
            coverId={coverId}
            busy={pending}
            onChange={(next) => setMedia([...next, ...media.filter((item) => removed.includes(item.id))])}
            onCoverChange={setCoverId}
            onRemove={(id) => {
              setRemoved((current) => [...current, id]);
              if (coverId === id) setCoverId(undefined);
            }}
            onUpload={uploadFiles}
            onAddVideoLink={(link, title) => addLink("video", link, title)}
            onAddSpinLink={(link, title) => addLink("spin", link, title)}
          />
        </EditorSection>

        <EditorSection id="seo" title="Search appearance">
          <div className="space-y-5">
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              Optional. Left blank, Google is shown “{name} — {values.priceOnApplication ? "POA" : values.price ? `£${Number(values.price).toLocaleString("en-GB")}` : "price"}” and a
              summary built from the car&rsquo;s details.
            </p>
            {text("seoTitle", `Search title (${values.seoTitle.length}/70)`)}
            <div>
              <Label htmlFor="seoDescription">Search description ({values.seoDescription.length}/170)</Label>
              <Textarea id="seoDescription" rows={3} value={values.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} className="mt-1.5 text-sm" />
              {error("seoDescription")}
            </div>
          </div>
        </EditorSection>
      </div>

      {/* ---- Status and publishing panel ---------------------------------------- */}
      <aside aria-label="Status and publishing" className="xl:sticky xl:top-6 xl:self-start">
        <div className="space-y-4 border border-[var(--border)] bg-[var(--background)] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={record.status} />
            {liveNow ? (
              <span className="text-xs text-success">On the website</span>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">Not on the website</span>
            )}
          </div>

          <Button type="button" size="md" className="w-full" disabled={!dirty || pending} onClick={() => startTransition(async () => void (await saveAll()))}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {dirty ? "Save changes" : "All changes saved"}
          </Button>

          <div>
            <h2 className="text-sm font-medium">{issues.length ? "Before it can go on the website" : "Ready for the website"}</h2>
            {issues.length ? (
              <ul className="mt-2 space-y-1.5">
                {issues.map((issue) => (
                  <li key={issue.code} className="flex gap-2 text-sm">
                    <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                    <a href={`#section-${issue.section === "visibility" ? "identity" : issue.section}`} className="underline-offset-2 hover:underline">
                      {issue.message}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex gap-2 text-sm">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                Everything a buyer needs is here.
              </p>
            )}
            {dirty ? <p className="mt-2 text-xs text-[var(--muted-foreground)]">Based on your unsaved changes.</p> : null}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            {record.status === "draft" || record.status === "sold" ? (
              <Button
                type="button"
                size="md"
                variant="brass"
                className="w-full"
                disabled={pending}
                onClick={() => run("Publish", () => publishVehicle(record.id), { saveFirst: true })}
              >
                {record.status === "sold" ? "Put back on sale" : dirty ? "Save and publish" : "Publish"}
              </Button>
            ) : null}
            {issues.length && (record.status === "draft" || record.status === "sold") ? (
              <p className="text-xs text-[var(--muted-foreground)]">Publishing will list what&rsquo;s missing if anything above isn&rsquo;t sorted.</p>
            ) : null}

            {record.status === "published" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() => run("Feature", () => setVehicleFeatured(record.id, !record.featured))}
                >
                  {record.featured ? "Remove from homepage" : "Feature on homepage"}
                </Button>
                <ConfirmButton
                  label="Mark as sold"
                  className="w-full"
                  title="Mark this car as sold?"
                  body="Its page stays on the website marked SOLD, and it leaves the stock list, the homepage and search."
                  confirmLabel="Mark as sold"
                  onConfirm={() => run("Mark as sold", () => markVehicleSold(record.id), { saveFirst: true })}
                />
                <ConfirmButton
                  label="Unpublish"
                  className="w-full"
                  title="Take this car off the website?"
                  body="It goes back to being a draft. You can publish it again at any time."
                  confirmLabel="Unpublish"
                  onConfirm={() => run("Unpublish", () => unpublishVehicle(record.id))}
                />
              </>
            ) : null}

            {record.status === "archived" ? (
              <Button type="button" size="sm" variant="outline" className="w-full" disabled={pending} onClick={() => run("Restore", () => restoreVehicle(record.id))}>
                Restore as draft
              </Button>
            ) : (
              <ConfirmButton
                label="Archive"
                className="w-full"
                tone="danger"
                title="Archive this car?"
                body="It's hidden from the website and moved to Archived. Nothing is deleted — you can restore it later."
                confirmLabel="Archive"
                onConfirm={() => run("Archive", () => archiveVehicle(record.id))}
              />
            )}

            <ConfirmButton
              label="Duplicate as a new draft"
              className="w-full"
              title="Duplicate this car?"
              body="Creates a new draft with the same specification and description, without photos, registration or history."
              confirmLabel="Duplicate"
              onConfirm={() =>
                startTransition(async () => {
                  if (dirty && !(await saveAll())) return;
                  await duplicateVehicle(record.id);
                })
              }
            />

            {liveNow ? (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 text-sm underline underline-offset-2">
                View on the website <ExternalLink aria-hidden className="size-3.5" />
              </a>
            ) : null}
          </div>

          {recommendations.length ? (
            <details className="border-t border-[var(--border)] pt-4">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
                Listing checklist ({recommendations.length} to improve)
              </summary>
              <ul className="mt-2 space-y-1.5">
                {recommendations.map((tip) => (
                  <li key={tip.message} className="flex gap-2 text-xs text-[var(--muted-foreground)]">
                    <CircleDashed aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <a href={`#section-${tip.section === "visibility" ? "identity" : tip.section}`} className="underline-offset-2 hover:underline">
                      {tip.message}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <p className="border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
            <Link href="/dashboard/inventory" className="underline underline-offset-2">
              Back to inventory
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}

/** Section anchors are prefixed so they never collide with field ids such as `price`. */
function EditorSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`section-${id}`} aria-labelledby={`section-${id}-title`} className="scroll-mt-6 border border-[var(--border)] bg-[var(--background)]">
      <h2 id={`section-${id}-title`} className="border-b border-[var(--border)] px-5 py-3.5 font-display text-xl">
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function mediaSignature(media: VehicleMedia[], coverId: string | undefined): string {
  return JSON.stringify([coverId ?? null, media.map((item) => (item.kind === "image" ? [item.id, item.category, item.alt] : [item.id, item.title]))]);
}
