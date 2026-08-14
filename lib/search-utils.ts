import {
  MAX_QUERIES,
  MAX_QUERY_LENGTH,
  type DurationFilter,
  type QualityFilter,
  type SearchOptions,
  type SortOption,
  type VideoResult,
} from "@/lib/stock-video";

export class SearchInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function parseQueries(input: string): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  for (const value of input.split(",")) {
    const query = value.trim().replace(/\s+/g, " ");
    if (!query) continue;
    if (query.length > MAX_QUERY_LENGTH) {
      throw new SearchInputError(`Each search must be ${MAX_QUERY_LENGTH} characters or fewer.`);
    }
    const key = query.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      queries.push(query);
    }
  }

  if (!queries.length) throw new SearchInputError("Enter at least one search term.");
  if (queries.length > MAX_QUERIES) {
    throw new SearchInputError("Maximum 10 searches at once.");
  }
  return queries;
}

export function dedupeResults(results: VideoResult[]): VideoResult[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();

  return results.filter((result) => {
    const id = `${result.provider.toLowerCase()}:${result.id}`;
    const source = result.providerUrl?.replace(/\/$/, "").toLowerCase();
    const fingerprint = [
      result.thumbnailUrl.split("?")[0],
      result.width,
      result.height,
      result.duration,
      result.author?.toLowerCase(),
    ].join("|");
    if (seenIds.has(id) || (source && seenUrls.has(source)) || seenFingerprints.has(fingerprint)) {
      return false;
    }
    seenIds.add(id);
    if (source) seenUrls.add(source);
    seenFingerprints.add(fingerprint);
    return true;
  });
}

function qualityRank(quality?: string): number {
  if (quality === "4K") return 3;
  if (quality === "Full HD") return 2;
  if (quality === "HD") return 1;
  return 0;
}

export function applyFiltersAndSort(results: VideoResult[], options: SearchOptions): VideoResult[] {
  const filtered = results.filter((result) => {
    if (options.orientation && result.orientation && result.orientation !== options.orientation) {
      return false;
    }
    if (options.duration && options.duration !== "any" && result.duration !== undefined) {
      if (options.duration === "under-15" && result.duration >= 15) return false;
      if (options.duration === "15-60" && (result.duration < 15 || result.duration > 60)) return false;
      if (options.duration === "over-60" && result.duration <= 60) return false;
    }
    if (options.quality && options.quality !== "any" && result.quality) {
      const required = qualityRank(
        options.quality === "full-hd" ? "Full HD" : options.quality === "4k" ? "4K" : "HD",
      );
      if (qualityRank(result.quality) < required) return false;
    }
    return true;
  });

  if (options.sort === "shortest") {
    return filtered.sort((a, b) => (a.duration ?? Number.MAX_SAFE_INTEGER) - (b.duration ?? Number.MAX_SAFE_INTEGER));
  }
  if (options.sort === "longest") {
    return filtered.sort((a, b) => (b.duration ?? -1) - (a.duration ?? -1));
  }
  return filtered;
}

export function asDurationFilter(value: string | null): DurationFilter {
  return (["under-15", "15-60", "over-60"] as readonly string[]).includes(value ?? "")
    ? (value as DurationFilter)
    : "any";
}

export function asQualityFilter(value: string | null): QualityFilter {
  return (["hd", "full-hd", "4k"] as readonly string[]).includes(value ?? "")
    ? (value as QualityFilter)
    : "any";
}

export function asSortOption(value: string | null): SortOption {
  return (["popular", "newest", "shortest", "longest"] as readonly string[]).includes(value ?? "")
    ? (value as SortOption)
    : "best-match";
}
