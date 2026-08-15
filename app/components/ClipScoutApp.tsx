"use client";

import {
  CircleAlert,
  ChevronRight,
  Clock3,
  Film,
  FolderKanban,
  Layers3,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FilterControls } from "@/app/components/FilterControls";
import { PreviewModal } from "@/app/components/PreviewModal";
import { ProjectsPanel } from "@/app/components/ProjectsPanel";
import { SelectedClipsTray } from "@/app/components/SelectedClipsTray";
import { cardKey, videoKey, VideoCard } from "@/app/components/VideoCard";
import { initialFilters, type Filters, type GroupState } from "@/app/components/workspace-ui-types";
import { rankClips } from "@/lib/clip-score";
import { suggestQueries, textSimilarityQuery } from "@/lib/query-expansion";
import { formatToOrientation, type ProviderStatus, type SearchResponse, type VideoResult } from "@/lib/stock-video";
import {
  createProject,
  MAX_RECENT_SEARCHES,
  mergeProjectClips,
  PROJECTS_STORAGE_KEY,
  RECENT_SEARCHES_STORAGE_KEY,
  type ClipProject,
  type SelectedClip,
} from "@/lib/workspace-types";

const examples = ["African fintech", "person using smartphone", "Lagos city", "money transfer", "startup office"];

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

function selectionKey(query: string, video: VideoResult) {
  return `${query.toLocaleLowerCase()}:${videoKey(video)}`;
}

function buildSearchParams(query: string, page: number, filters: Filters) {
  return new URLSearchParams({
    q: query,
    page: String(page),
    perPage: "20",
    format: filters.format,
    duration: filters.duration,
    quality: filters.quality,
    sort: filters.sort,
  });
}

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-block skeleton-media" />
      <div className="skeleton-card__body"><div className="skeleton-block skeleton-title" /><div className="skeleton-block skeleton-meta" /></div>
    </div>
  );
}

export default function ClipScoutApp() {
  const [input, setInput] = useState("");
  const [queries, setQueries] = useState<string[]>([]);
  const [groups, setGroups] = useState<Record<string, GroupState>>({});
  const [globalFilters, setGlobalFilters] = useState<Filters>(initialFilters);
  const [providers, setProviders] = useState<SearchResponse["providers"]>({
    pexels: { available: true },
    pixabay: { available: true },
  });
  const [selected, setSelected] = useState<Map<string, SelectedClip>>(new Map());
  const [preview, setPreview] = useState<{ items: SelectedClip[]; index: number }>();
  const [hoveredKey, setHoveredKey] = useState<string>();
  const [projects, setProjects] = useState<ClipProject[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [expansion, setExpansion] = useState<{ query: string; options: string[]; selected: Set<string> }>();
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    try {
      const storedProjects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) ?? "[]") as unknown;
      const storedRecent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(storedProjects)) setProjects(storedProjects as ClipProject[]);
      if (Array.isArray(storedRecent)) setRecentSearches(storedRecent.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_SEARCHES));
    } catch {
      localStorage.removeItem(PROJECTS_STORAGE_KEY);
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (storageReady) localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects, storageReady]);

  useEffect(() => {
    if (storageReady) localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
  }, [recentSearches, storageReady]);

  const selectedClips = useMemo(() => [...selected.values()], [selected]);
  const resultCount = useMemo(() => queries.reduce((total, query) => total + (groups[query]?.results.length ?? 0), 0), [groups, queries]);
  const sourceCount = Number(providers.pexels.available) + Number(providers.pixabay.available);

  async function fetchGroup(query: string, page: number, filters: Filters, append = false) {
    setGroups((current) => ({
      ...current,
      [query]: {
        ...(current[query] ?? { query, results: [], page: 1, hasMore: false, filters }),
        filters,
        loading: !append,
        loadingMore: append,
        error: undefined,
      },
    }));

    try {
      const response = await fetch(`/api/search?${buildSearchParams(query, page, filters)}`);
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
          ? [...(existing?.results ?? []), ...incoming].filter((video, index, all) => all.findIndex((item) => videoKey(item) === videoKey(video)) === index)
          : incoming;
        return {
          ...current,
          [query]: { query, results, page, hasMore: Boolean(group?.hasMore), filters, loading: false, loadingMore: false },
        };
      });
    } catch (error) {
      setGroups((current) => ({
        ...current,
        [query]: {
          ...(current[query] ?? { query, results: [], page, hasMore: false, filters }),
          filters,
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : "Search is temporarily unavailable.",
        },
      }));
    }
  }

  function rememberSearch(nextQueries: string[]) {
    setRecentSearches((current) => {
      const combined = [...nextQueries, ...current];
      const seen = new Set<string>();
      return combined.filter((query) => {
        const key = query.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MAX_RECENT_SEARCHES);
    });
  }

  function executeSearch(nextQueries: string[], filters = globalFilters) {
    if (!nextQueries.length || nextQueries.length > 10) return;
    setInput(nextQueries.join(", "));
    setQueries(nextQueries);
    setGroups(Object.fromEntries(nextQueries.map((query) => [query, {
      query,
      results: [],
      page: 1,
      hasMore: false,
      loading: true,
      loadingMore: false,
      filters,
    }])));
    setProviders({ pexels: { available: true }, pixabay: { available: true } });
    setExpansion(undefined);
    rememberSearch(nextQueries);
    void Promise.allSettled(nextQueries.map((query) => fetchGroup(query, 1, filters)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseClientQueries(input);
    if (!parsed.length) return setFormError("Enter at least one search term.");
    if (parsed.length > 10) return setFormError("Maximum 10 searches at once.");
    if (parsed.some((query) => query.length > 100)) return setFormError("Each search must be 100 characters or fewer.");
    setFormError(undefined);
    executeSearch(parsed);
  }

  function updateGlobalFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    const filters = { ...globalFilters, [key]: value };
    setGlobalFilters(filters);
    setGroups((current) => Object.fromEntries(Object.entries(current).map(([query, group]) => [query, { ...group, filters }])));
    if (queries.length) void Promise.allSettled(queries.map((query) => fetchGroup(query, 1, filters)));
  }

  function updateGroupFilter<Key extends keyof Filters>(query: string, key: Key, value: Filters[Key]) {
    const filters = { ...(groups[query]?.filters ?? globalFilters), [key]: value };
    void fetchGroup(query, 1, filters);
  }

  function toggleSelected(query: string, video: VideoResult) {
    const key = selectionKey(query, video);
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else next.set(key, { key, query, video });
      return next;
    });
  }

  function openSinglePreview(query: string, video: VideoResult) {
    setHoveredKey(undefined);
    setPreview({ items: [{ key: selectionKey(query, video), query, video }], index: 0 });
  }

  function openTextSimilar(video: VideoResult) {
    const query = textSimilarityQuery(video);
    setFormError(undefined);
    executeSearch([query]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addExpandedQueries() {
    if (!expansion?.selected.size) return;
    const next = parseClientQueries([...queries, ...expansion.selected].join(", "));
    if (next.length > 10) return setFormError("Maximum 10 searches at once. Remove a search before expanding.");
    setFormError(undefined);
    executeSearch(next);
  }

  const providerWarnings = Object.entries(providers).filter(([, status]) => status.error || !status.available) as [string, ProviderStatus][];
  const bothProvidersFailed = sourceCount === 0 && providerWarnings.length === 2;

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ClipScout home"><span className="brand-mark"><Film size={20} strokeWidth={2.4} /></span><span>ClipScout</span></a>
        <div className="header-actions">
          <div className="header-promise"><span /> Search once. Find everywhere.</div>
          <button className="projects-button" type="button" onClick={() => setProjectsOpen(true)}><FolderKanban size={16} /> Projects <b>{projects.length}</b></button>
        </div>
      </header>

      <section className={`hero ${queries.length ? "hero--compact" : ""}`} id="top">
        <div className="hero-eyebrow"><Sparkles size={14} /> B-roll discovery workspace</div>
        <h1>All your B-roll.<br /><em>One search.</em></h1>
        <p className="hero-copy">Search stock footage from multiple sources in one place. Paste every shot you need and let ClipScout organize the hunt.</p>
        <form className="search-panel" onSubmit={handleSubmit}>
          <div className="search-box">
            <Search className="search-icon" size={23} />
            <label className="sr-only" htmlFor="footage-search">What footage are you looking for?</label>
            <textarea id="footage-search" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="African fintech, person using phone, money transfer" rows={2} maxLength={1050} />
            <button className="search-button" type="submit"><span>Scout footage</span><ChevronRight size={18} /></button>
          </div>
          <div className="search-help"><span><Layers3 size={14} /> Tip: Separate multiple searches with commas</span><span>Up to 10 searches at once</span></div>
          {formError && <div className="form-error"><CircleAlert size={16} /> {formError}</div>}
        </form>

        {!queries.length && (
          <>
            <div className="example-row"><span>Try a search</span>{examples.map((example) => <button key={example} type="button" onClick={() => { setInput(example); executeSearch([example]); }}>{example}</button>)}</div>
            {recentSearches.length > 0 && (
              <div className="recent-searches">
                <div><span><Clock3 size={14} /> Recent searches</span><button type="button" onClick={() => setRecentSearches([])}>Clear history</button></div>
                <nav aria-label="Recent searches">{recentSearches.map((query) => <button key={query} type="button" onClick={() => executeSearch([query])}>{query}<ChevronRight size={14} /></button>)}</nav>
              </div>
            )}
          </>
        )}
      </section>

      {queries.length > 0 && (
        <section className="workspace" aria-live="polite">
          <div className="workspace-header">
            <div><span className="section-label">Your searches</span><h2>{queries.length} {queries.length === 1 ? "keyword" : "keywords"} <i /> {sourceCount} {sourceCount === 1 ? "source" : "sources"} <i /> {resultCount}{Object.values(groups).some((group) => group?.hasMore) ? "+" : ""} clips</h2></div>
            <FilterControls filters={globalFilters} onChange={updateGlobalFilter} />
          </div>

          {bothProvidersFailed ? (
            <div className="provider-warning provider-warning--critical"><CircleAlert size={18} /><span><strong>We couldn’t load stock footage right now.</strong> Please try again.</span></div>
          ) : providerWarnings.map(([provider, status]) => (
            <div className="provider-warning" key={provider}><CircleAlert size={17} /><span><strong>{provider[0].toUpperCase() + provider.slice(1)}</strong> {status.error ? status.error.replace(new RegExp(`^${provider}\\s*`, "i"), "") : "is not configured."} {sourceCount > 0 && "Showing results from available sources."}</span></div>
          ))}

          <div className="search-groups">
            {queries.map((query, index) => {
              const group = groups[query];
              const filters = group?.filters ?? globalFilters;
              const ranked = group?.results?.length ? rankClips(group.results, query, { orientation: formatToOrientation(filters.format) }) : [];
              const bestMatches = ranked.slice(0, 10);
              const bestIds = new Set(bestMatches.map(videoKey));
              const allResults = ranked.filter((video) => !bestIds.has(videoKey(video)));
              const selectedInGroup = selectedClips.filter((clip) => clip.query === query).length;
              return (
                <section className="result-group" key={query}>
                  <div className="group-heading">
                    <div className="query-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="group-title"><h2>{query}</h2><p>{group?.loading ? "Scouting Pexels + Pixabay…" : `${group?.results.length ?? 0} clips found${selectedInGroup ? ` · ${selectedInGroup} selected` : ""}`}</p></div>
                    <div className="heading-rule" />
                    <button className="expand-search-button" type="button" onClick={() => setExpansion({ query, options: suggestQueries(query), selected: new Set() })}><Sparkles size={14} /> Expand search</button>
                  </div>
                  <FilterControls compact filters={filters} onChange={(key, value) => updateGroupFilter(query, key, value)} />

                  {expansion?.query === query && (
                    <div className="expansion-panel">
                      <div><strong>Related searches</strong><span>Choose only the concepts you want to search.</span></div>
                      <div className="expansion-options">{expansion.options.map((option) => {
                        const active = expansion.selected.has(option);
                        return <button key={option} type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => setExpansion((current) => { if (!current) return current; const next = new Set(current.selected); if (next.has(option)) next.delete(option); else next.add(option); return { ...current, selected: next }; })}>{active ? "✓ " : "+ "}{option}</button>;
                      })}</div>
                      <div className="expansion-actions"><button type="button" disabled={!expansion.selected.size} onClick={addExpandedQueries}>Search selected ({expansion.selected.size})</button><button type="button" onClick={() => setExpansion(undefined)} aria-label="Close related searches"><X size={16} /></button></div>
                    </div>
                  )}

                  {group?.loading ? (
                    <div className="video-grid" aria-label={`Loading results for ${query}`}>{Array.from({ length: 8 }, (_, card) => <SkeletonCard key={card} />)}</div>
                  ) : group?.error ? (
                    <div className="group-empty"><CircleAlert size={22} /><h3>We couldn’t search this keyword.</h3><p>{group.error}</p><button type="button" onClick={() => fetchGroup(query, 1, filters)}>Try again</button></div>
                  ) : !group?.results.length ? (
                    <div className="group-empty"><Film size={24} /><h3>No clips found for “{query}”</h3><p>Try a broader phrase or relax the filters.</p></div>
                  ) : (
                    <>
                      <div className="result-subheading"><span><Sparkles size={15} /> Best matches</span><small>Top {bestMatches.length} by ClipScore</small></div>
                      <div className="video-grid video-grid--best">{bestMatches.map((video) => (
                        <VideoCard key={`best:${videoKey(video)}`} video={video} query={query} bestMatch selected={selected.has(selectionKey(query, video))} playing={hoveredKey === cardKey(query, video)} onHover={setHoveredKey} onLeave={() => setHoveredKey(undefined)} onSelect={() => toggleSelected(query, video)} onPreview={() => openSinglePreview(query, video)} onFindSimilar={() => openTextSimilar(video)} />
                      ))}</div>
                      {allResults.length > 0 && <><div className="result-subheading result-subheading--all"><span>All results</span><small>{allResults.length} more loaded</small></div><div className="video-grid">{allResults.map((video) => (
                        <VideoCard key={videoKey(video)} video={video} query={query} selected={selected.has(selectionKey(query, video))} playing={hoveredKey === cardKey(query, video)} onHover={setHoveredKey} onLeave={() => setHoveredKey(undefined)} onSelect={() => toggleSelected(query, video)} onPreview={() => openSinglePreview(query, video)} onFindSimilar={() => openTextSimilar(video)} />
                      ))}</div></>}
                      {group.hasMore && <button className="load-more" type="button" disabled={group.loadingMore} onClick={() => fetchGroup(query, group.page + 1, filters, true)}>{group.loadingMore ? <><LoaderCircle className="spin" size={17} /> Scouting more…</> : <>View more for “{query}” <ChevronRight size={17} /></>}</button>}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {!queries.length && <section className="workflow-strip"><div><span>01</span><strong>Paste every shot</strong><p>Describe a whole video’s B-roll needs in one go.</p></div><ChevronRight size={20} /><div><span>02</span><strong>Scout every source</strong><p>Pexels and Pixabay are searched concurrently.</p></div><ChevronRight size={20} /><div><span>03</span><strong>Build your shortlist</strong><p>Preview, select, organize, then download what’s ready.</p></div></section>}

      <footer className="site-footer"><a className="brand brand--footer" href="#top"><span className="brand-mark"><Film size={18} /></span>ClipScout</a><p>Footage results provided by <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a> and <a href="https://pixabay.com" target="_blank" rel="noreferrer">Pixabay</a>. Creator rights remain with their respective contributors.</p></footer>

      {preview && <PreviewModal items={preview.items} index={preview.index} onIndexChange={(index) => setPreview({ ...preview, index })} onClose={() => setPreview(undefined)} />}
      <SelectedClipsTray clips={selectedClips} onRemove={(key) => setSelected((current) => { const next = new Map(current); next.delete(key); return next; })} onClear={() => setSelected(new Map())} onPreview={(index) => setPreview({ items: selectedClips, index })} onOpenProjects={() => setProjectsOpen(true)} />
      <ProjectsPanel
        open={projectsOpen}
        projects={projects}
        selected={selectedClips}
        onClose={() => setProjectsOpen(false)}
        onCreate={(name) => setProjects((current) => [...current, createProject(name)])}
        onRename={(id, name) => setProjects((current) => current.map((project) => project.id === id ? { ...project, name: name.trim() || project.name, updatedAt: new Date().toISOString() } : project))}
        onDelete={(id) => setProjects((current) => current.filter((project) => project.id !== id))}
        onAddSelected={(id) => setProjects((current) => current.map((project) => project.id === id ? mergeProjectClips(project, selectedClips) : project))}
        onRemoveClip={(projectId, clipKey) => setProjects((current) => current.map((project) => project.id === projectId ? { ...project, clips: project.clips.filter((clip) => clip.key !== clipKey), updatedAt: new Date().toISOString() } : project))}
        onPreview={(items, index) => setPreview({ items, index })}
      />
    </main>
  );
}

function mergeProviderStatus(current: ProviderStatus, incoming: ProviderStatus): ProviderStatus {
  if (!incoming.available || incoming.error) return incoming;
  return current.available && !current.error ? current : incoming;
}
