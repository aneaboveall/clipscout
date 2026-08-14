import { cached } from "@/lib/server-cache";
import {
  getOrientation,
  getQuality,
  type ProviderSearchResult,
  type SearchOptions,
  type StockVideoProvider,
  type VideoResult,
} from "@/lib/stock-video";

type PexelsFile = {
  id: number;
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  link: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user?: { name?: string };
  video_files: PexelsFile[];
};

type PexelsResponse = {
  videos: PexelsVideo[];
  next_page?: string;
};

function videoFile(files: PexelsFile[], mode: "preview" | "download"): PexelsFile | undefined {
  const mp4s = files.filter((file) => file.file_type === "video/mp4" && file.link && file.width && file.height);
  if (!mp4s.length) return undefined;
  if (mode === "preview") {
    return [...mp4s].sort((a, b) => Math.abs((a.width ?? 0) - 960) - Math.abs((b.width ?? 0) - 960))[0];
  }
  return [...mp4s].sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0];
}

function normalize(video: PexelsVideo): VideoResult {
  const preview = videoFile(video.video_files, "preview");
  const download = videoFile(video.video_files, "download");
  const width = download?.width ?? video.width;
  const height = download?.height ?? video.height;
  return {
    id: String(video.id),
    provider: "Pexels",
    providerUrl: video.url,
    title: video.user?.name ? `Video by ${video.user.name}` : `Pexels video ${video.id}`,
    description: "Stock footage from Pexels",
    thumbnailUrl: video.image,
    previewUrl: preview?.link,
    downloadUrl: download?.link,
    width: width ?? undefined,
    height: height ?? undefined,
    duration: video.duration,
    fps: download?.fps ?? preview?.fps ?? undefined,
    quality: getQuality(width ?? undefined, height ?? undefined),
    orientation: getOrientation(video.width, video.height),
    author: video.user?.name,
  };
}

export class PexelsProvider implements StockVideoProvider {
  readonly id = "pexels" as const;
  readonly name = "Pexels";
  readonly available = Boolean(process.env.PEXELS_API_KEY);

  async search(query: string, options: SearchOptions = {}): Promise<ProviderSearchResult> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error("Pexels is not configured.");
    const params = new URLSearchParams({
      query,
      page: String(options.page ?? 1),
      per_page: String(Math.min(options.perPage ?? 12, 80)),
    });
    if (options.orientation) params.set("orientation", options.orientation);
    if (options.quality && options.quality !== "any") {
      params.set("size", options.quality === "4k" ? "large" : options.quality === "full-hd" ? "medium" : "small");
    }
    const key = `pexels:${params.toString().toLowerCase()}`;
    return cached(key, 24 * 60 * 60 * 1000, async () => {
      const response = await fetch(`https://api.pexels.com/v1/videos/search?${params}`, {
        headers: { Authorization: apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Pexels rate limit reached. Try again later.");
        throw new Error(`Pexels search failed (${response.status}).`);
      }
      const data = (await response.json()) as PexelsResponse;
      return { results: data.videos.map(normalize), hasMore: Boolean(data.next_page) };
    });
  }
}
