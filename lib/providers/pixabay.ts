import { cached } from "@/lib/server-cache";
import {
  getOrientation,
  getQuality,
  type ProviderSearchResult,
  type SearchOptions,
  type StockVideoProvider,
  type VideoResult,
} from "@/lib/stock-video";

type PixabayRendition = { url: string; width: number; height: number; size: number; thumbnail: string };
type PixabayVideo = {
  id: number;
  pageURL: string;
  tags?: string;
  duration?: number;
  user?: string;
  views?: number;
  videos: { large?: PixabayRendition; medium?: PixabayRendition; small?: PixabayRendition; tiny?: PixabayRendition };
};
type PixabayResponse = { totalHits: number; hits: PixabayVideo[] };

function availableRenditions(video: PixabayVideo): PixabayRendition[] {
  return [video.videos.large, video.videos.medium, video.videos.small, video.videos.tiny].filter(
    (item): item is PixabayRendition => Boolean(item?.url),
  );
}

function normalize(video: PixabayVideo): VideoResult {
  const renditions = availableRenditions(video);
  const download = [...renditions].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const preview = video.videos.small?.url ? video.videos.small : video.videos.tiny ?? download;
  const thumbnail = preview?.thumbnail || download?.thumbnail;
  const title = video.tags?.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 3).join(" · ");
  return {
    id: String(video.id),
    provider: "Pixabay",
    providerUrl: video.pageURL,
    title: title || `Pixabay video ${video.id}`,
    description: video.tags,
    thumbnailUrl: thumbnail,
    previewUrl: preview?.url,
    downloadUrl: download?.url ? `${download.url}${download.url.includes("?") ? "&" : "?"}download=1` : undefined,
    width: download?.width,
    height: download?.height,
    duration: video.duration,
    quality: getQuality(download?.width, download?.height),
    orientation: getOrientation(download?.width, download?.height),
    author: video.user,
  };
}

export class PixabayProvider implements StockVideoProvider {
  readonly id = "pixabay" as const;
  readonly name = "Pixabay";
  readonly available = Boolean(process.env.PIXABAY_API_KEY);

  async search(query: string, options: SearchOptions = {}): Promise<ProviderSearchResult> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error("Pixabay is not configured.");
    const perPage = Math.max(3, Math.min(options.perPage ?? 12, 200));
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      page: String(options.page ?? 1),
      per_page: String(perPage),
      safesearch: "true",
      order: options.sort === "newest" ? "latest" : "popular",
    });
    if (options.quality && options.quality !== "any") {
      const minimum = options.quality === "4k" ? [3840, 2160] : options.quality === "full-hd" ? [1920, 1080] : [1280, 720];
      params.set("min_width", String(minimum[0]));
      params.set("min_height", String(minimum[1]));
    }
    const cacheParams = new URLSearchParams(params);
    cacheParams.set("key", "server-key");
    const key = `pixabay:${cacheParams.toString().toLowerCase()}`;
    return cached(key, 24 * 60 * 60 * 1000, async () => {
      const response = await fetch(`https://pixabay.com/api/videos/?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Pixabay rate limit reached. Try again later.");
        throw new Error(`Pixabay search failed (${response.status}).`);
      }
      const data = (await response.json()) as PixabayResponse;
      return {
        results: data.hits.map(normalize).filter((video) => video.thumbnailUrl),
        hasMore: (options.page ?? 1) * perPage < data.totalHits,
      };
    });
  }
}
