import { PexelsProvider } from "@/lib/providers/pexels";
import { PixabayProvider } from "@/lib/providers/pixabay";
import { applyFiltersAndSort, dedupeResults } from "@/lib/search-utils";
import {
  DEFAULT_RESULTS_PER_GROUP,
  type SearchGroup,
  type SearchOptions,
  type SearchResponse,
  type StockVideoProvider,
  type VideoResult,
} from "@/lib/stock-video";

function interleave(lists: VideoResult[][]): VideoResult[] {
  const output: VideoResult[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest; index += 1) {
    for (const list of lists) {
      if (list[index]) output.push(list[index]);
    }
  }
  return output;
}

export async function searchStockVideos(queries: string[], options: SearchOptions): Promise<SearchResponse> {
  const providers: StockVideoProvider[] = [new PexelsProvider(), new PixabayProvider()];
  const available = providers.filter((provider) => provider.available);
  const statuses: SearchResponse["providers"] = {
    pexels: { available: providers[0].available },
    pixabay: { available: providers[1].available },
  };

  if (!available.length) {
    return {
      groups: queries.map((query) => ({ query, results: [], hasMore: false })),
      providers: statuses,
    };
  }

  const targetCount = options.perPage ?? DEFAULT_RESULTS_PER_GROUP;
  const providerCount = Math.min(80, Math.max(3, Math.ceil(targetCount / available.length)));
  const tasks = queries.map(async (query): Promise<SearchGroup> => {
    const settled = await Promise.allSettled(
      available.map((provider) => provider.search(query, { ...options, perPage: providerCount })),
    );
    const providerResults: VideoResult[][] = [];
    let hasMore = false;
    settled.forEach((outcome, index) => {
      const provider = available[index];
      if (outcome.status === "fulfilled") {
        providerResults.push(outcome.value.results);
        hasMore ||= outcome.value.hasMore;
      } else {
        statuses[provider.id] = {
          available: true,
          error: outcome.reason instanceof Error ? outcome.reason.message : `${provider.name} is temporarily unavailable.`,
        };
      }
    });
    const results = applyFiltersAndSort(dedupeResults(interleave(providerResults)), options).slice(0, targetCount);
    return { query, results, hasMore };
  });

  const settledGroups = await Promise.allSettled(tasks);
  const groups = settledGroups.map((outcome, index): SearchGroup =>
    outcome.status === "fulfilled"
      ? outcome.value
      : { query: queries[index], results: [], hasMore: false },
  );
  return { groups, providers: statuses };
}
