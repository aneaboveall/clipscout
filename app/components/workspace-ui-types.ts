import type { DurationFilter, FormatFilter, QualityFilter, SortOption, VideoResult } from "@/lib/stock-video";

export type Filters = {
  format: FormatFilter;
  duration: DurationFilter;
  quality: QualityFilter;
  sort: SortOption;
};

export type GroupState = {
  query: string;
  results: VideoResult[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  filters: Filters;
  error?: string;
};

export const initialFilters: Filters = {
  format: "auto",
  duration: "any",
  quality: "any",
  sort: "best-match",
};
