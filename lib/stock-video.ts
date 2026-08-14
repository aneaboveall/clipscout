export type Orientation = "portrait" | "landscape" | "square";
export type DurationFilter = "any" | "under-15" | "15-60" | "over-60";
export type QualityFilter = "any" | "hd" | "full-hd" | "4k";
export type SortOption = "best-match" | "popular" | "newest" | "shortest" | "longest";

export type VideoResult = {
  id: string;
  provider: string;
  providerUrl?: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  previewUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  quality?: string;
  orientation?: Orientation;
  author?: string;
};

export type SearchOptions = {
  page?: number;
  perPage?: number;
  orientation?: Orientation;
  duration?: DurationFilter;
  quality?: QualityFilter;
  sort?: SortOption;
};

export type ProviderSearchResult = {
  results: VideoResult[];
  hasMore: boolean;
};

export interface StockVideoProvider {
  readonly id: "pexels" | "pixabay";
  readonly name: string;
  readonly available: boolean;
  search(query: string, options?: SearchOptions): Promise<ProviderSearchResult>;
}

export type SearchGroup = {
  query: string;
  results: VideoResult[];
  hasMore: boolean;
};

export type ProviderStatus = {
  available: boolean;
  error?: string;
};

export type SearchResponse = {
  groups: SearchGroup[];
  providers: {
    pexels: ProviderStatus;
    pixabay: ProviderStatus;
  };
};

export const MAX_QUERIES = 10;
export const MAX_QUERY_LENGTH = 100;
export const DEFAULT_RESULTS_PER_GROUP = 20;

export function getOrientation(width?: number, height?: number): Orientation | undefined {
  if (!width || !height) return undefined;
  const ratio = width / height;
  if (ratio > 1.08) return "landscape";
  if (ratio < 0.92) return "portrait";
  return "square";
}

export function getQuality(width?: number, height?: number): string | undefined {
  if (!width || !height) return undefined;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  if (longEdge >= 3840 || shortEdge >= 2160) return "4K";
  if (longEdge >= 1920 || shortEdge >= 1080) return "Full HD";
  if (longEdge >= 1280 || shortEdge >= 720) return "HD";
  return "SD";
}
