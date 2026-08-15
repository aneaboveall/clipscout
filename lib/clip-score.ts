import type { SearchOptions, VideoResult } from "@/lib/stock-video";

function tokens(value: string): string[] {
  return value.toLocaleLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1);
}

function qualityPoints(quality?: string): number {
  if (quality === "4K") return 16;
  if (quality === "Full HD") return 13;
  if (quality === "HD") return 9;
  return quality ? 4 : 0;
}

export function popularityScore(video: VideoResult): number {
  const popularity = video.popularity;
  if (!popularity || (!popularity.views && !popularity.downloads && !popularity.likes)) return 5;
  const views = Math.min(10, Math.log10((popularity.views ?? 0) + 1) * 1.7);
  const downloads = Math.min(6, Math.log10((popularity.downloads ?? 0) + 1) * 1.25);
  const likes = Math.min(4, Math.log10((popularity.likes ?? 0) + 1));
  return views + downloads + likes;
}

export function scoreClip(video: VideoResult, query: string, options: SearchOptions = {}): number {
  const queryText = query.trim().toLocaleLowerCase();
  const queryTokens = [...new Set(tokens(queryText))];
  const haystack = [video.title, video.description, ...(video.tags ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();

  let relevance = haystack.includes(queryText) ? 20 : 0;
  if (queryTokens.length) {
    const matched = queryTokens.filter((token) => haystack.includes(token)).length;
    relevance += (matched / queryTokens.length) * 24;
  }

  let usability = 0;
  if (video.previewUrl) usability += 8;
  if (video.downloadUrl) usability += 6;
  else if (video.providerUrl) usability += 3;
  if (video.duration !== undefined) {
    if (video.duration >= 5 && video.duration <= 45) usability += 7;
    else if (video.duration <= 90) usability += 4;
    else usability += 1;
  }
  if (video.width && video.height) usability += 3;
  if (options.orientation && video.orientation === options.orientation) usability += 5;

  const raw = relevance + qualityPoints(video.quality) + popularityScore(video) + usability;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function rankClips(videos: VideoResult[], query: string, options: SearchOptions = {}): VideoResult[] {
  const scored = videos.map((video) => ({ ...video, clipScore: scoreClip(video, query, options) }));
  const byProvider = new Map<string, VideoResult[]>();
  for (const video of scored) {
    const list = byProvider.get(video.provider) ?? [];
    list.push(video);
    byProvider.set(video.provider, list);
  }

  const providerPercentiles = new Map<string, number>();
  for (const [provider, items] of byProvider) {
    [...items]
      .sort((a, b) => (b.clipScore ?? 0) - (a.clipScore ?? 0))
      .forEach((video, index) => {
        const percentile = items.length === 1 ? 1 : 1 - index / (items.length - 1);
        providerPercentiles.set(`${provider}:${video.id}`, percentile);
      });
  }

  return scored
    .map((video) => {
      const percentile = providerPercentiles.get(`${video.provider}:${video.id}`) ?? 0.5;
      return { ...video, clipScore: Math.round((video.clipScore ?? 0) * 0.75 + percentile * 25) };
    })
    .sort((a, b) => (b.clipScore ?? 0) - (a.clipScore ?? 0));
}
