import assert from "node:assert/strict";
import test from "node:test";
import { rankClips, scoreClip } from "../lib/clip-score";
import { downloadableSelection, MAX_ZIP_CLIPS, sanitizeFilename } from "../lib/download-zip";
import { suggestQueries, textSimilarityQuery } from "../lib/query-expansion";
import type { VideoResult } from "../lib/stock-video";
import { mergeProjectClips, type ClipProject, type SelectedClip } from "../lib/workspace-types";

function video(overrides: Partial<VideoResult> = {}): VideoResult {
  return {
    id: "clip-1",
    provider: "Pexels",
    title: "African mobile money transfer",
    description: "A person receives a digital payment on a smartphone",
    thumbnailUrl: "https://example.test/thumb.jpg",
    previewUrl: "https://example.test/preview.mp4",
    downloadUrl: "https://example.test/download.mp4",
    width: 3840,
    height: 2160,
    duration: 18,
    orientation: "landscape",
    quality: "4K",
    tags: ["fintech", "money transfer", "smartphone"],
    ...overrides,
  };
}

function selected(index: number, overrides: Partial<VideoResult> = {}): SelectedClip {
  const item = video({ id: String(index), ...overrides });
  return { key: `money transfer:${item.provider}:${item.id}`, query: "money transfer", video: item };
}

test("ClipScore rewards relevance, usable previews, and verified quality", () => {
  const strong = video();
  const weak = video({ id: "weak", title: "Abstract background", description: undefined, tags: undefined, previewUrl: undefined, downloadUrl: undefined, width: 640, height: 360, quality: "SD", duration: 180 });
  assert.ok(scoreClip(strong, "money transfer") > scoreClip(weak, "money transfer"));
});

test("ClipScore ranking remains provider-normalized", () => {
  const results = rankClips([
    video({ id: "pexels-1", provider: "Pexels" }),
    video({ id: "pexels-2", provider: "Pexels", title: "Generic phone" }),
    video({ id: "pixabay-1", provider: "Pixabay", title: "Money transfer banking app" }),
  ], "money transfer");
  assert.equal(results.length, 3);
  assert.ok(results.every((item) => typeof item.clipScore === "number"));
  assert.deepEqual(new Set(results.map((item) => item.provider)), new Set(["Pexels", "Pixabay"]));
});

test("query expansion is deterministic and explicitly user-selectable", () => {
  assert.deepEqual(suggestQueries("money transfer"), ["mobile payment", "sending money", "receiving money", "digital payment", "banking app"]);
  assert.equal(textSimilarityQuery(video()), "fintech money transfer smartphone");
});

test("ZIP helpers sanitize creator-friendly paths and enforce the 20 clip limit", () => {
  assert.equal(sanitizeFilename("  Lagos Street / B-roll!  "), "lagos-street-b-roll");
  const clips = Array.from({ length: MAX_ZIP_CLIPS + 2 }, (_, index) => selected(index));
  clips.push(selected(99, { downloadUrl: undefined }));
  const batch = downloadableSelection(clips);
  assert.equal(batch.eligible.length, MAX_ZIP_CLIPS);
  assert.equal(batch.excluded.length, 3);
  assert.ok(batch.excluded.some((item) => /No permitted direct/.test(item.reason)));
});

test("project clip merging persists metadata and removes duplicates", () => {
  const project: ClipProject = { id: "project", name: "Paybox Video", createdAt: "2026-01-01", updatedAt: "2026-01-01", clips: [selected(1)] };
  const merged = mergeProjectClips(project, [selected(1), selected(2)]);
  assert.equal(merged.clips.length, 2);
  assert.equal(merged.name, "Paybox Video");
});
