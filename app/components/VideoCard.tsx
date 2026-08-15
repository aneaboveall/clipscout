"use client";

import { ArrowDownToLine, ArrowUpRight, Check, Play, ScanSearch, Sparkles } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { VideoResult } from "@/lib/stock-video";

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins ? `${mins}:${String(secs).padStart(2, "0")}` : `0:${String(secs).padStart(2, "0")}`;
}

export function videoKey(video: VideoResult) {
  return `${video.provider}:${video.id}`;
}

export function cardKey(query: string, video: VideoResult) {
  return `${query.toLocaleLowerCase()}:${videoKey(video)}`;
}

export function VideoCard({
  video,
  query,
  selected,
  playing,
  bestMatch = false,
  onHover,
  onLeave,
  onSelect,
  onPreview,
  onFindSimilar,
}: {
  video: VideoResult;
  query: string;
  selected: boolean;
  playing: boolean;
  bestMatch?: boolean;
  onHover: (key: string) => void;
  onLeave: () => void;
  onSelect: () => void;
  onPreview: () => void;
  onFindSimilar: () => void;
}) {
  const key = cardKey(query, video);
  const handlePointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && video.previewUrl) onHover(key);
  };

  return (
    <article
      className={`video-card ${selected ? "video-card--selected" : ""} ${playing ? "video-card--playing" : ""}`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={onLeave}
    >
      <div
        className="video-card__visual"
        role="button"
        tabIndex={0}
        aria-label={`Preview ${video.title}`}
        onClick={onPreview}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPreview();
          }
        }}
      >
        {playing && video.previewUrl ? (
          // Provider preview files do not expose captions and are deliberately muted.
          <video key={video.previewUrl} src={video.previewUrl} poster={video.thumbnailUrl} autoPlay muted loop playsInline preload="none" onError={onLeave} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        )}
        <div className="video-card__shade" />
        <button
          className="select-clip"
          type="button"
          aria-label={selected ? `Deselect ${video.title}` : `Select ${video.title}`}
          aria-pressed={selected}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          {selected ? <Check size={15} strokeWidth={3} /> : <span />}
        </button>
        <span className={`provider-badge provider-badge--${video.provider.toLowerCase()}`}>{video.provider}</span>
        {bestMatch && <span className="match-badge"><Sparkles size={11} /> {video.clipScore ?? "Top"}</span>}
        {playing ? (
          <span className="playing-indicator"><Play size={11} fill="currentColor" /> Preview</span>
        ) : (
          <span className="hover-hint"><Play size={12} fill="currentColor" /> Hover to play</span>
        )}
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
              <ArrowUpRight size={14} /> Source
            </a>
          ) : null}
          <button className="similar-link" type="button" onClick={onFindSimilar} title={`Find text-related footage for ${query}`}>
            <ScanSearch size={14} /> <span>Find similar · text</span>
          </button>
        </div>
      </div>
    </article>
  );
}
