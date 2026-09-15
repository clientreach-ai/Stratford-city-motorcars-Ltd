"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Film, Loader2, RotateCw, Star, Trash2, Upload, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { PHOTO_CATEGORIES, type PhotoCategory, type VehicleImage, type VehicleMedia } from "@/lib/inventory/types";
import { LISTING_PHOTO_TARGET } from "@/lib/inventory/visibility";

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  exterior: "Exterior",
  interior: "Interior",
  detail: "Detail",
  documents: "Documents",
};

export interface UploadOutcome {
  ok: boolean;
  message: string;
  added: VehicleMedia[];
  failures: { file: string; message: string }[];
}

/**
 * Photographs, walkaround videos and 360° links for one car.
 *
 * Controlled by the vehicle editor: classification, alt text, order, cover and
 * removals are held as unsaved changes and saved with the rest of the car by
 * the one Save button. Uploading and adding links happen straight away,
 * because the file has to reach the server either way.
 */
export function MediaManager({
  vehicleName,
  media,
  coverId,
  onChange,
  onCoverChange,
  onRemove,
  onUpload,
  onAddVideoLink,
  onAddSpinLink,
  busy,
}: {
  vehicleName: string;
  media: VehicleMedia[];
  coverId: string | undefined;
  onChange: (media: VehicleMedia[]) => void;
  onCoverChange: (id: string) => void;
  onRemove: (id: string) => void;
  onUpload: (files: File[], category: PhotoCategory, onProgress: (fraction: number) => void) => Promise<UploadOutcome>;
  onAddVideoLink: (link: string, title: string) => Promise<string | null>;
  onAddSpinLink: (link: string, title: string) => Promise<string | null>;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>("exterior");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ tone: "ok" | "error"; text: string; failures: UploadOutcome["failures"] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<VehicleImage | null>(null);
  const [videoLink, setVideoLink] = useState("");
  const [spinLink, setSpinLink] = useState("");
  const [linkError, setLinkError] = useState<{ video?: string; spin?: string }>({});

  const images = media.filter((item): item is VehicleImage => item.kind === "image");
  const dealerImages = images.filter((image) => image.provenance === "dealer");
  const others = media.filter((item) => item.kind !== "image");
  const counts = Object.fromEntries(PHOTO_CATEGORIES.map((category) => [category, dealerImages.filter((image) => image.category === category).length]));
  const effectiveCover = dealerImages.find((image) => image.id === coverId) ?? dealerImages.find((image) => image.category === "exterior") ?? dealerImages[0];

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploadMessage(null);
    setProgress(0);
    const outcome = await onUpload(files, uploadCategory, setProgress);
    setProgress(null);
    setUploadMessage({ tone: outcome.ok ? "ok" : "error", text: outcome.message, failures: outcome.failures });
    if (fileRef.current) fileRef.current.value = "";
  }

  function move(id: string, direction: -1 | 1) {
    const index = media.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function update(id: string, patch: Partial<VehicleImage>) {
    onChange(media.map((item) => (item.id === id && item.kind === "image" ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-6">
      {/* Summary of what the listing has */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={cn("border px-2.5 py-1.5", counts.exterior ? "border-success/40" : "border-danger/40 text-danger")}>
          Exterior: {counts.exterior}
          {counts.exterior ? "" : " — needed"}
        </span>
        <span className={cn("border px-2.5 py-1.5", counts.interior ? "border-success/40" : "border-danger/40 text-danger")}>
          Interior: {counts.interior}
          {counts.interior ? "" : " — needed"}
        </span>
        <span className="border border-[var(--border)] px-2.5 py-1.5">Detail: {counts.detail}</span>
        <span className="border border-[var(--border)] px-2.5 py-1.5">Documents: {counts.documents}</span>
        <span className="border border-[var(--border)] px-2.5 py-1.5">
          Total: {dealerImages.length} of {LISTING_PHOTO_TARGET}+
        </span>
      </div>

      {/* Upload */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload([...event.dataTransfer.files]);
        }}
        className={cn(
          "border border-dashed p-5 transition-colors",
          dragging ? "border-[var(--primary)] bg-[var(--surface)]" : "border-[var(--border-strong)]",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <p className="text-sm font-medium">Add photographs or a walkaround video</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
              Drag files here or choose them. Photos: JPEG, PNG, WebP or AVIF, at least 800px across. Videos: MP4, up to
              200 MB. Location data is removed from every photo before it&rsquo;s stored.
            </p>
          </div>
          <div className="w-full sm:w-44">
            <Label htmlFor="upload-category">New photos are</Label>
            <Select
              id="upload-category"
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as PhotoCategory)}
              className="mt-1.5 h-11 text-sm"
            >
              {PHOTO_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABEL[category]}
                </option>
              ))}
            </Select>
          </div>
          <input
            ref={fileRef}
            id="media-files"
            type="file"
            aria-label="Photographs or videos to upload"
            // Reached through the visible "Choose files" button.
            tabIndex={-1}
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(event) => void upload([...(event.target.files ?? [])])}
          />
          <Button type="button" size="md" onClick={() => fileRef.current?.click()} disabled={progress !== null || busy}>
            {progress !== null ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" />}
            {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : "Choose files"}
          </Button>
        </div>
        {progress !== null ? (
          <div className="mt-4 h-1 bg-[var(--muted)]" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-[var(--primary)] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        ) : null}
        {uploadMessage ? (
          <div role={uploadMessage.tone === "error" ? "alert" : "status"} className={cn("mt-4 text-sm", uploadMessage.tone === "error" && "text-danger")}>
            <p>{uploadMessage.text}</p>
            {uploadMessage.failures.length ? (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {uploadMessage.failures.map((failure) => (
                  <li key={failure.file}>
                    <span className="font-medium">{failure.file}:</span> {failure.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Photographs */}
      {images.length ? (
        <ol className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {images.map((image) => {
            const position = media.findIndex((item) => item.id === image.id);
            const isCover = effectiveCover?.id === image.id;
            const number = position + 1;
            return (
              <li key={image.id} className="border border-[var(--border)] bg-[var(--background)]">
                <button
                  type="button"
                  onClick={() => setPreview(image)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]"
                  aria-label={`Preview photo ${number}`}
                >
                  <Image src={image.src} alt="" fill sizes="(min-width: 1536px) 18vw, (min-width: 640px) 30vw, 90vw" className="object-cover" />
                  <span className="absolute left-2 top-2 bg-ink-950/80 px-2 py-1 text-[0.6875rem] text-bone">{number}</span>
                  {isCover ? (
                    <span className="absolute right-2 top-2 flex items-center gap-1 bg-brass px-2 py-1 text-[0.6875rem] text-ink-950">
                      <Star aria-hidden className="size-3" /> Cover
                    </span>
                  ) : null}
                  {image.provenance === "library" ? (
                    <span className="absolute inset-x-0 bottom-0 bg-danger px-2 py-1 text-[0.6875rem] text-white">
                      Library image — never shown on the website
                    </span>
                  ) : null}
                </button>
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`category-${image.id}`}>Shows</Label>
                      <Select
                        id={`category-${image.id}`}
                        value={image.category}
                        onChange={(event) => update(image.id, { category: event.target.value as PhotoCategory })}
                        className="mt-1 h-11 text-sm"
                      >
                        {PHOTO_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {CATEGORY_LABEL[category]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 w-full"
                        onClick={() => onCoverChange(image.id)}
                        disabled={isCover || image.provenance !== "dealer"}
                      >
                        <Star className="size-4" />
                        {isCover ? "Cover" : "Make cover"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`alt-${image.id}`}>Description</Label>
                    <Input
                      id={`alt-${image.id}`}
                      value={image.alt}
                      maxLength={250}
                      placeholder={`e.g. ${vehicleName}, front three-quarter view`}
                      onChange={(event) => update(image.id, { alt: event.target.value })}
                      className="mt-1 h-11 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton label={`Move photo ${number} earlier`} onClick={() => move(image.id, -1)} disabled={position === 0}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label={`Move photo ${number} later`} onClick={() => move(image.id, 1)} disabled={position === media.length - 1}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <div className="ml-auto">
                      <ConfirmButton
                        label={
                          <span className="flex items-center gap-1.5">
                            <Trash2 aria-hidden className="size-4" /> Remove
                          </span>
                        }
                        title="Remove this photograph?"
                        body="It will be deleted when you save your changes. This can't be undone after saving."
                        confirmLabel="Remove"
                        tone="danger"
                        onConfirm={() => onRemove(image.id)}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          No photographs yet. The car can&rsquo;t be published until it has at least one exterior and one interior photo
          taken by you.
        </p>
      )}

      {/* Videos and 360 links */}
      <div className="border-t border-[var(--border)] pt-6">
        <h3 className="text-sm font-medium">Walkaround video and 360° spin</h3>
        {others.length ? (
          <ul className="mt-3 divide-y divide-[var(--border)] border border-[var(--border)]">
            {others.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                {item.kind === "video" ? <Film aria-hidden className="size-4 shrink-0" /> : <RotateCw aria-hidden className="size-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">
                  {item.title}{" "}
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {item.kind === "video"
                      ? item.source.type === "file"
                        ? "Uploaded video"
                        : item.source.type === "youtube"
                          ? "YouTube"
                          : "Vimeo"
                      : "360° spin link"}
                  </span>
                </span>
                {item.kind === "spin" ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-xs underline">
                    Open <ExternalLink aria-hidden className="size-3" />
                  </a>
                ) : null}
                <ConfirmButton
                  label="Remove"
                  title={item.kind === "video" ? "Remove this video?" : "Remove this 360° link?"}
                  body="It will be removed when you save your changes."
                  confirmLabel="Remove"
                  tone="danger"
                  onConfirm={() => onRemove(item.id)}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <LinkAdder
            id="videoLink"
            label="YouTube or Vimeo link"
            hint="An unlisted YouTube video keeps large files off the website."
            value={videoLink}
            error={linkError.video}
            onValue={setVideoLink}
            busy={busy}
            onAdd={async () => {
              const error = await onAddVideoLink(videoLink, "Walkaround video");
              setLinkError((current) => ({ ...current, video: error ?? undefined }));
              if (!error) setVideoLink("");
            }}
          />
          <LinkAdder
            id="spinLink"
            label="360° spin link"
            hint="Optional. Opens in a new tab from the car's page."
            value={spinLink}
            error={linkError.spin}
            onValue={setSpinLink}
            busy={busy}
            onAdd={async () => {
              const error = await onAddSpinLink(spinLink, "360° spin");
              setLinkError((current) => ({ ...current, spin: error ?? undefined }));
              if (!error) setSpinLink("");
            }}
          />
        </div>
      </div>

      {preview ? <PreviewDialog image={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center border border-[var(--border-strong)] transition-colors hover:border-[var(--primary)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function LinkAdder({
  id,
  label,
  hint,
  value,
  error,
  onValue,
  onAdd,
  busy,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  onValue: (value: string) => void;
  onAdd: () => Promise<void>;
  busy: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          onChange={(event) => onValue(event.target.value)}
          placeholder="https://"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className="h-11 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11"
          disabled={!value.trim() || pending || busy}
          onClick={async () => {
            setPending(true);
            await onAdd();
            setPending(false);
          }}
        >
          Add
        </Button>
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-[var(--muted-foreground)]">
        {hint}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PreviewDialog({ image, onClose }: { image: VehicleImage; onClose: () => void }) {
  return (
    <dialog
      open
      aria-label="Photo preview"
      className="fixed inset-0 z-100 m-0 flex h-dvh max-h-none w-full max-w-none flex-col bg-ink-950/95 p-4 text-bone"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="flex justify-end">
        <button type="button" autoFocus onClick={onClose} aria-label="Close preview" className="flex size-11 items-center justify-center border border-bone/30">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative mt-3 flex-1">
        <Image src={image.src} alt={image.alt} fill sizes="100vw" className="object-contain" />
      </div>
      <p className="mt-3 text-center text-xs text-bone/60">
        {image.width} × {image.height}px · {image.alt || "No description yet"}
      </p>
    </dialog>
  );
}
