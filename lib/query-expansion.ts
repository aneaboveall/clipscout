import type { VideoResult } from "@/lib/stock-video";

const RELATED: Record<string, string[]> = {
  "money transfer": ["mobile payment", "sending money", "receiving money", "digital payment", "banking app"],
  fintech: ["mobile banking", "digital wallet", "contactless payment", "finance app", "startup team"],
  smartphone: ["using mobile phone", "phone close up", "texting on phone", "mobile app", "phone notification"],
  lagos: ["Lagos traffic", "Lagos skyline", "Nigeria street", "African city", "Lagos market"],
  entrepreneur: ["startup founder", "small business owner", "creative professional", "team meeting", "working on laptop"],
};

export function suggestQueries(query: string, limit = 5): string[] {
  const normalized = query.trim().toLocaleLowerCase();
  const direct = RELATED[normalized];
  if (direct) return direct.slice(0, limit);

  const matching = Object.entries(RELATED).find(([key]) => normalized.includes(key));
  if (matching) return matching[1].filter((item) => item.toLocaleLowerCase() !== normalized).slice(0, limit);

  return [
    `${query} close up`,
    `person with ${query}`,
    `${query} lifestyle`,
    `${query} city scene`,
    `${query} vertical video`,
  ].slice(0, limit);
}

export type SimilaritySearchHandler = (query: string, source: VideoResult) => void;

export function textSimilarityQuery(video: VideoResult): string {
  const tags = (video.tags ?? []).filter((tag) => tag.length > 2).slice(0, 4);
  if (tags.length) return tags.join(" ");
  if (video.description && !video.description.toLocaleLowerCase().startsWith("stock footage")) {
    return video.description.split(/[.,]/)[0].trim().slice(0, 90);
  }
  return video.title.replace(/^video by\s+/i, "").slice(0, 90);
}
