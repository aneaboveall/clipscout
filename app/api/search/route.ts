import { NextResponse } from "next/server";
import { searchStockVideos } from "@/lib/search-service";
import {
  asDurationFilter,
  asQualityFilter,
  asSortOption,
  parseQueries,
  SearchInputError,
} from "@/lib/search-utils";
import { DEFAULT_RESULTS_PER_GROUP, type Orientation } from "@/lib/stock-video";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = url.searchParams.get("queries") ?? url.searchParams.get("q") ?? "";
    const queries = parseQueries(input);
    const page = Math.max(1, Math.min(Number(url.searchParams.get("page")) || 1, 50));
    const perPage = Math.max(1, Math.min(Number(url.searchParams.get("perPage")) || DEFAULT_RESULTS_PER_GROUP, 40));
    const orientationValue = url.searchParams.get("orientation");
    const orientation = (["portrait", "landscape", "square"] as const).includes(orientationValue as Orientation)
      ? (orientationValue as Orientation)
      : undefined;
    const response = await searchStockVideos(queries, {
      page,
      perPage,
      orientation,
      duration: asDurationFilter(url.searchParams.get("duration")),
      quality: asQualityFilter(url.searchParams.get("quality")),
      sort: asSortOption(url.searchParams.get("sort")),
    });
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const status = error instanceof SearchInputError ? error.status : 500;
    const message = error instanceof SearchInputError ? error.message : "Search is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status });
  }
}
