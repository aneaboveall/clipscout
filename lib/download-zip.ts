import type { SelectedClip } from "@/lib/workspace-types";

export const MAX_ZIP_CLIPS = 20;
export const MAX_ZIP_BYTES = 500 * 1024 * 1024;

export type ZipProgress = {
  phase: "fetching" | "packing" | "complete";
  current: number;
  total: number;
  message: string;
};

export type ZipExcludedClip = {
  clip: SelectedClip;
  reason: string;
};

export type ZipReport = {
  added: number;
  excluded: ZipExcludedClip[];
  filename?: string;
};

export function sanitizeFilename(value: string, fallback = "clip"): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return sanitized || fallback;
}

export function downloadableSelection(clips: SelectedClip[]) {
  const eligible = clips.filter((clip) => Boolean(clip.video.downloadUrl)).slice(0, MAX_ZIP_CLIPS);
  const excluded: ZipExcludedClip[] = clips
    .filter((clip) => !clip.video.downloadUrl)
    .map((clip) => ({ clip, reason: "No permitted direct download URL" }));
  clips.filter((clip) => clip.video.downloadUrl).slice(MAX_ZIP_CLIPS).forEach((clip) => {
    excluded.push({ clip, reason: `Batch limit is ${MAX_ZIP_CLIPS} clips` });
  });
  return { eligible, excluded };
}

function extensionFor(url: string): string {
  return url.split("?")[0].match(/\.(mp4|webm|mov)$/i)?.[1]?.toLocaleLowerCase() ?? "mp4";
}

export async function downloadSelectionZip(
  clips: SelectedClip[],
  onProgress: (progress: ZipProgress) => void,
  label = "ClipScout-Selection",
): Promise<ZipReport> {
  const { eligible, excluded } = downloadableSelection(clips);
  if (!eligible.length) return { added: 0, excluded };

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const root = zip.folder(sanitizeFilename(label, "clipscout-selection"))!;
  const queryCounts = new Map<string, number>();
  let added = 0;
  let totalBytes = 0;

  for (let index = 0; index < eligible.length; index += 1) {
    const clip = eligible[index];
    onProgress({ phase: "fetching", current: index, total: eligible.length, message: `Preparing ${index + 1} of ${eligible.length} clips` });
    try {
      const response = await fetch(clip.video.downloadUrl!, { mode: "cors" });
      if (!response.ok) throw new Error(`Download returned ${response.status}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("Provider returned an empty file");
      if (totalBytes + blob.size > MAX_ZIP_BYTES) {
        excluded.push({ clip, reason: "Batch would exceed the 500 MB browser limit" });
        continue;
      }
      totalBytes += blob.size;
      const folderName = sanitizeFilename(clip.query, "untitled-search");
      const count = (queryCounts.get(folderName) ?? 0) + 1;
      queryCounts.set(folderName, count);
      const fileName = `${folderName}-${String(count).padStart(2, "0")}.${extensionFor(clip.video.downloadUrl!)}`;
      root.folder(folderName)!.file(fileName, blob, { binary: true });
      added += 1;
    } catch (error) {
      excluded.push({ clip, reason: error instanceof Error ? error.message : "Browser could not fetch this clip" });
    }
  }

  if (!added) return { added, excluded };
  onProgress({ phase: "packing", current: added, total: eligible.length, message: "Packing your B-roll workspace" });
  const blob = await zip.generateAsync(
    { type: "blob", compression: "STORE", streamFiles: true },
    (metadata) => onProgress({ phase: "packing", current: Math.round(metadata.percent), total: 100, message: `Packing ZIP · ${Math.round(metadata.percent)}%` }),
  );
  const filename = `${sanitizeFilename(label, "clipscout-selection")}.zip`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  onProgress({ phase: "complete", current: added, total: eligible.length, message: `${added} clips added to ZIP` });
  return { added, excluded, filename };
}
