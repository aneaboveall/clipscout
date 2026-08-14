"use client";

import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Film,
  Layers3,
  LoaderCircle,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  DurationFilter,
  Orientation,
  ProviderStatus,
  QualityFilter,
  SearchResponse,
  SortOption,
  VideoResult,
} from "@/lib/stock-video";

type Filters = {
  orientation: "all" | Orientation;
  duration: DurationFilter;
  quality: QualityFilter;
  sort: SortOption;
};

type GroupState = {
  query: string;
  results: VideoResult[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error?: string;
};

const examples = ["African fintech", "person using smartphone", "Lagos city", "money transfer", "startup office"];
const initialFilters: Filters = { orientation: "all", duration: "any", quality: "any", sort: "best-match" };

function parseClientQueries(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(",")
    .map((value) => value.trim().replace(/\s+/g, " "))
    .filter((value) => {
      if (!value) return false;
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins ? `${mins}:${String(secs).padStart(2, "0")}` : `0:${String(secs).padStart(2, "0")}`;
}

function videoKey(video: VideoResult) {
  return `${video.provider}:${video.id}`;
}

function buildSearchParams(query: string, page: number, filters: Filters) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    perPage: "20",
    duration: filters.duration,
    quality: filters.quality,
    sort: filters.sort,
  });
  if (filters.orientation !== "all") params.set("orientation", filters.orientation);
  return params;
}

function VideoCard({
  video,
  selected,
  onSelect,
  onPreview,
}: {
  video: VideoResult;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <article className={`video-card ${selected ? "video-card--selected" : ""}`}>
      <div className="video-card__visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        <div className="video-card__shade" />
        <button
          className="select-clip"
          type="button"
          aria-label={selected ? `Deselect ${video.title}` : `Select ${video.title}`}
          aria-pressed={selected}
          onClick={onSelect}
        >
          {selected ? <Check size={15} strokeWidth={3} /> : <span />}
        </button>
        <span className={`provider-badge provider-badge--${video.provider.toLowerCase()}`}>{video.provider}</span>
        <button className="preview-trigger" type="button" onClick={onPreview} aria-label={`Preview ${video.title}`}>
          <Play size={18} fill="currentColor" />
        </button>
        <span className="duration-badge">{formatDuration(video.duration)}</span>
      </div>
      <div className="video-card__body">
        <h3>{video.title}</h3>
        <div className="clip-meta">
          <span>{video.width && video.height ? `${video.width}×${video.height}` : "Resolution —"}</span>
          <i />
          <span>{video.quality ?? "Quality —"}</span>
          <i />
          <span>{video.orientation ?? "—"}</span>
        </div>
        <div className="card-actions">
          <button type="button" className="card-action card-action--primary" onClick={onPreview}>
            <Play size={14} /> Preview
          </button>
          {video.downloadUrl ? (
            <a className="card-action" href={video.downloadUrl} target="_blank" rel="noreferrer" aria-label={`Download ${video.title}`}>
              <ArrowDownToLine size={14} /> Download
            </a>
          ) : video.providerUrl ? (
            <a className="card-action" href={video.providerUrl} target="_blank" rel="noreferrer">
              <ArrowUpRight size={14} /> Open
            </a>
          ) : null}
          {video.providerUrl ? (
            <a className="source-link" href={video.providerUrl} target="_blank" rel="noreferrer" aria-label={`Open on ${video.provider}`}>
              <ArrowUpRight size={15} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-block skeleton-media" />
      <div className="skeleton-card__body">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-meta" />
      </div>
    </div>
  );
}

function PreviewModal({ video, onClose }: { video: VideoResult; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close preview"><X size={20} /></button>
        <div className="preview-stage">
          {video.previewUrl ? (
            // Provider previews do not expose caption tracks; audio starts muted for a safe visual preview.
            <video src={video.previewUrl} poster={video.thumbnailUrl} controls autoPlay muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnailUrl} alt={video.title} />
          )}
        </div>
        <div className="preview-details">
          <div className="preview-kicker"><span className={`provider-dot provider-dot--${video.provider.toLowerCase()}`} /> {video.provider}</div>
          <h2 id="preview-title">{video.title}</h2>
          {video.author && <p>Footage by {video.author}</p>}
          <dl className="preview-stats">
            <div><dt>Duration</dt><dd>{formatDuration(video.duration)}</dd></div>
            <div><dt>Resolution</dt><dd>{video.width && video.height ? `${video.width} × ${video.height}` : "Unknown"}</dd></div>
            <div><dt>Format</dt><dd>{video.orientation ?? "Unknown"}</dd></div>
            <div><dt>Quality</dt><dd>{video.quality ?? "Unknown"}</dd></div>
          </dl>
          <div className="preview-actions">
            {video.downloadUrl && (
              <a className="button button--accent" href={video.downloadUrl} target="_blank" rel="noreferrer">
                <ArrowDownToLine size={17} /> Download clip
              </a>
            )}
            {video.providerUrl && (
              <a className="button button--ghost" href={video.providerUrl} target="_blank" rel="noreferrer">
                Open on {video.provider} <ArrowUpRight size={17} />
              </a>
            )}
          </div>
          <p className="provider-note">Provided by {video.provider}. Review the provider license before use.</p>
        </div>
      </section>
    </div>
  );
}

export default function ClipScoutApp() {
  const [input, setInput] = useState("");
  const [queries, setQueries] = useState<string[]>([]);
  const [groups, setGroups] = useState<Record<string, GroupState>>({});
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [providers, setProviders] = useState<SearchResponse["providers"]>({
    pexels: { available: true },
    pixabay: { available: true },
  });
  const [selected, setSelected] = useState<Map<string, VideoResult>>(new Map());
  const [preview, setPreview] = useState<VideoResult | null>(null);
  const [formError, setFormError] = useState<string>();

  const resultCount = useMemo(
    () => queries.reduce((total, query) => total + (groups[query]?.results.length ?? 0), 0),
    [groups, queries],
  );
  const sourceCount = Number(providers.pexels.available) + Number(providers.pixabay.available);

  async function fetchGroup(query: string, page: number, activeFilters: Filters, append = false) {
    setGroups((current) => ({
      ...current,
      [query]: {
        ...(current[query] ?? { query, results: [], page: 1, hasMore: false, loading: false, loadingMore: false }),
        loading: !append,
        loadingMore: append,
        error: undefined,
      },
    }));
    try {
      const response = await fetch(`/api/search?${buildSearchParams(query, page, activeFilters)}`);
      const data = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Search failed.");
      const group = data.groups[0];
      setProviders((current) => ({
        pexels: mergeProviderStatus(current.pexels, data.providers.pexels),
        pixabay: mergeProviderStatus(current.pixabay, data.providers.pixabay),
      }));
      setGroups((current) => {
        const existing = current[query];
        const incoming = group?.results ?? [];
        const results = append
          ? [...existing.results, ...incoming].filter((video, index, all) => all.findIndex((item) => videoKey(item) === videoKey(video)) === index)
          : incoming;
        return {
          ...current,
          [query]: { query, results, page, hasMore: Boolean(group?.hasMore), loading: false, loadingMore: false },
        };
      });
    } catch (error) {
      setGroups((current) => ({
        ...current,
        [query]: {
          ...(current[query] ?? { query, results: [], page, hasMore: false }),
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : "Search is temporarily unavailable.",
        },
      }));
    }
  }

  function executeSearch(nextQueries: string[], activeFilters = filters) {
    setQueries(nextQueries);
    setGroups(Object.fromEntries(nextQueries.map((query) => [query, {
      query,
      results: [],
      page: 1,
      hasMore: false,
      loading: true,
      loadingMore: false,
    }])));
    setProviders({ pexels: { available: true }, pixabay: { available: true } });
    void Promise.allSettled(nextQueries.map((query) => fetchGroup(query, 1, activeFilters)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseClientQueries(input);
    if (!parsed.length) {
      setFormError("Enter at least one search term.");
      return;
    }
    if (parsed.length > 10) {
      setFormError("Maximum 10 searches at once.");
      return;
    }
    if (parsed.some((query) => query.length > 100)) {
      setFormError("Each search must be 100 characters or fewer.");
      return;
    }
    setFormError(undefined);
    executeSearch(parsed);
  }

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (queries.length) executeSearch(queries, next);
  }

  function toggleSelected(video: VideoResult) {
    setSelected((current) => {
      const next = new Map(current);
      const key = videoKey(video);
      if (next.has(key)) next.delete(key);
      else next.set(key, video);
      return next;
    });
  }

  function openSources() {
    [...selected.values()].filter((video) => video.providerUrl).forEach((video) => {
      window.open(video.providerUrl, "_blank", "noopener,noreferrer");
    });
  }

  const providerWarnings = Object.entries(providers).filter(([, status]) => status.error || !status.available) as [string, ProviderStatus][];

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ClipScout home">
          <span className="brand-mark"><Film size={20} strokeWidth={2.4} /></span>
          <span>ClipScout</span>
        </a>
        <div className="header-promise"><span /> Search once. Find everywhere.</div>
      </header>

      <section className={`hero ${queries.length ? "hero--compact" : ""}`} id="top">
        <div className="hero-eyebrow"><Sparkles size={14} /> Multi-source footage search</div>
        <h1>All your B-roll.<br /><em>One search.</em></h1>
        <p className="hero-copy">Search stock footage from multiple sources in one place. Paste every shot you need and let ClipScout organize the hunt.</p>

        <form className="search-panel" onSubmit={handleSubmit}>
          <div className="search-box">
            <Search className="search-icon" size={23} />
            <label className="sr-only" htmlFor="footage-search">What footage are you looking for?</label>
            <textarea
              id="footage-search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="African fintech, person using phone, money transfer"
              rows={2}
              maxLength={1050}
            />
            <button className="search-button" type="submit"><span>Scout footage</span><ChevronRight size={18} /></button>
          </div>
          <div className="search-help">
            <span><Layers3 size={14} /> Tip: Separate multiple searches with commas</span>
            <span>Up to 10 searches at once</span>
          </div>
          {formError && <div className="form-error"><CircleAlert size={16} /> {formError}</div>}
        </form>

        {!queries.length && (
          <div className="example-row">
            <span>Try a search</span>
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => setInput(example)}>{example}</button>
            ))}
          </div>
        )}
      </section>

      {queries.length > 0 && (
        <section className="workspace" aria-live="polite">
          <div className="workspace-header">
            <div>
              <span className="section-label">Your searches</span>
              <h2>{queries.length} {queries.length === 1 ? "keyword" : "keywords"} <i /> {sourceCount} {sourceCount === 1 ? "source" : "sources"} <i /> {resultCount}{Object.values(groups).some((group) => group?.hasMore) ? "+" : ""} clips</h2>
            </div>
            <div className="filter-bar" aria-label="Search filters">
              <label>Orientation<select value={filters.orientation} onChange={(event) => updateFilter("orientation", event.target.value as Filters["orientation"])}><option value="all">All formats</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="square">Square</option></select></label>
              <label>Duration<select value={filters.duration} onChange={(event) => updateFilter("duration", event.target.value as DurationFilter)}><option value="any">Any length</option><option value="under-15">Under 15 sec</option><option value="15-60">15–60 sec</option><option value="over-60">Over 60 sec</option></select></label>
              <label>Quality<select value={filters.quality} onChange={(event) => updateFilter("quality", event.target.value as QualityFilter)}><option value="any">Any quality</option><option value="hd">HD+</option><option value="full-hd">Full HD+</option><option value="4k">4K</option></select></label>
              <label>Sort by<select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as SortOption)}><option value="best-match">Best match</option><option value="popular">Popular</option><option value="newest">Newest</option><option value="shortest">Shortest</option><option value="longest">Longest</option></select></label>
            </div>
          </div>

          {providerWarnings.map(([provider, status]) => (
            <div className="provider-warning" key={provider}>
              <CircleAlert size={17} />
              <span><strong>{provider[0].toUpperCase() + provider.slice(1)}</strong> {status.error ? status.error.replace(new RegExp(`^${provider}\\s*`, "i"), "") : "is not configured."} {sourceCount > 0 && "Showing results from available sources."}</span>
            </div>
          ))}

          <div className="search-groups">
            {queries.map((query, index) => {
              const group = groups[query];
              return (
                <section className="result-group" key={query}>
                  <div className="group-heading">
                    <div className="query-number">{String(index + 1).padStart(2, "0")}</div>
                    <div><h2>{query}</h2><p>{group?.loading ? "Scouting Pexels + Pixabay…" : `${group?.results.length ?? 0} clips found`}</p></div>
                    <div className="heading-rule" />
                  </div>
                  {group?.loading ? (
                    <div className="video-grid" aria-label={`Loading results for ${query}`}>
                      {Array.from({ length: 8 }, (_, card) => <SkeletonCard key={card} />)}
                    </div>
                  ) : group?.error ? (
                    <div className="group-empty"><CircleAlert size={22} /><h3>We couldn’t search this keyword.</h3><p>{group.error}</p><button type="button" onClick={() => fetchGroup(query, 1, filters)}>Try again</button></div>
                  ) : !group?.results.length ? (
                    <div className="group-empty"><Film size={24} /><h3>No clips found for “{query}”</h3><p>Try a broader phrase or relax the filters.</p></div>
                  ) : (
                    <>
                      <div className="video-grid">
                        {group.results.map((video) => (
                          <VideoCard
                            key={videoKey(video)}
                            video={video}
                            selected={selected.has(videoKey(video))}
                            onSelect={() => toggleSelected(video)}
                            onPreview={() => setPreview(video)}
                          />
                        ))}
                      </div>
                      {group.hasMore && (
                        <button className="load-more" type="button" disabled={group.loadingMore} onClick={() => fetchGroup(query, group.page + 1, filters, true)}>
                          {group.loadingMore ? <><LoaderCircle className="spin" size={17} /> Scouting more…</> : <>View more for “{query}” <ChevronRight size={17} /></>}
                        </button>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {!queries.length && (
        <section className="workflow-strip">
          <div><span>01</span><strong>Paste every shot</strong><p>Describe a whole video’s B-roll needs in one go.</p></div>
          <ChevronRight size={20} />
          <div><span>02</span><strong>Scout every source</strong><p>Pexels and Pixabay are searched concurrently.</p></div>
          <ChevronRight size={20} />
          <div><span>03</span><strong>Build your shortlist</strong><p>Preview, select, then open the clips you need.</p></div>
        </section>
      )}

      <footer className="site-footer">
        <a className="brand brand--footer" href="#top"><span className="brand-mark"><Film size={18} /></span>ClipScout</a>
        <p>Footage results provided by <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a> and <a href="https://pixabay.com" target="_blank" rel="noreferrer">Pixabay</a>. Creator rights remain with their respective contributors.</p>
      </footer>

      {preview && <PreviewModal video={preview} onClose={() => setPreview(null)} />}

      {selected.size > 0 && (
        <div className="selection-bar">
          <div className="selection-count"><span>{selected.size}</span><div><strong>{selected.size} {selected.size === 1 ? "clip" : "clips"} selected</strong><small>Across {new Set([...selected.values()].map((video) => video.provider)).size} sources</small></div></div>
          <div className="selection-actions">
            <button type="button" onClick={() => setPreview([...selected.values()][0])}><Play size={16} /> Preview selected</button>
            <button className="selection-primary" type="button" onClick={openSources}><ArrowUpRight size={16} /> Open sources</button>
            <button className="clear-selection" type="button" onClick={() => setSelected(new Map())} aria-label="Clear selection"><X size={18} /></button>
          </div>
        </div>
      )}
    </main>
  );
}

function mergeProviderStatus(current: ProviderStatus, incoming: ProviderStatus): ProviderStatus {
  if (!incoming.available) return incoming;
  if (incoming.error) return incoming;
  return current.available && !current.error ? current : incoming;
}
