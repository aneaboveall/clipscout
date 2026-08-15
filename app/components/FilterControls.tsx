"use client";

import type { Filters } from "@/app/components/workspace-ui-types";
import type { DurationFilter, FormatFilter, QualityFilter, SortOption } from "@/lib/stock-video";

export function FilterControls({
  filters,
  onChange,
  compact = false,
}: {
  filters: Filters;
  onChange: <Key extends keyof Filters>(key: Key, value: Filters[Key]) => void;
  compact?: boolean;
}) {
  return (
    <div className={`filter-bar ${compact ? "filter-bar--compact" : ""}`} aria-label={compact ? "Keyword filters" : "Global search filters"}>
      <label>
        Format
        <select value={filters.format} onChange={(event) => onChange("format", event.target.value as FormatFilter)}>
          <option value="auto">Auto</option>
          <option value="9:16">9:16 vertical</option>
          <option value="16:9">16:9 landscape</option>
          <option value="1:1">1:1 square</option>
        </select>
      </label>
      <label>
        Duration
        <select value={filters.duration} onChange={(event) => onChange("duration", event.target.value as DurationFilter)}>
          <option value="any">Any length</option>
          <option value="under-15">Under 15 sec</option>
          <option value="15-60">15–60 sec</option>
          <option value="over-60">Over 60 sec</option>
        </select>
      </label>
      <label>
        Quality
        <select value={filters.quality} onChange={(event) => onChange("quality", event.target.value as QualityFilter)}>
          <option value="any">Any quality</option>
          <option value="hd">HD+</option>
          <option value="full-hd">Full HD+</option>
          <option value="4k">4K</option>
        </select>
      </label>
      <label>
        Sort by
        <select value={filters.sort} onChange={(event) => onChange("sort", event.target.value as SortOption)}>
          <option value="best-match">Best match</option>
          <option value="popular">Popular</option>
          <option value="newest">Newest</option>
          <option value="shortest">Shortest</option>
          <option value="longest">Longest</option>
        </select>
      </label>
    </div>
  );
}
