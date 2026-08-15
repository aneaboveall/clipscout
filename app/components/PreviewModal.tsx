"use client";

import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import type { SelectedClip } from "@/lib/workspace-types";

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins ? `${mins}:${String(secs).padStart(2, "0")}` : `0:${String(secs).padStart(2, "0")}`;
}

export function PreviewModal({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: SelectedClip[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const video = item?.video;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [index, items.length, onClose, onIndexChange]);

  if (!video) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close preview"><X size={20} /></button>
        <div className="preview-stage">
          {video.previewUrl ? (
            // Provider previews do not expose caption tracks; audio starts muted.
            <video key={`${video.provider}:${video.id}`} src={video.previewUrl} poster={video.thumbnailUrl} controls autoPlay muted playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnailUrl} alt={video.title} />
          )}
          {items.length > 1 && (
            <div className="preview-carousel-controls">
              <button type="button" disabled={index === 0} onClick={() => onIndexChange(index - 1)} aria-label="Previous selected clip"><ArrowLeft size={18} /></button>
              <span>Clip {index + 1} of {items.length}</span>
              <button type="button" disabled={index === items.length - 1} onClick={() => onIndexChange(index + 1)} aria-label="Next selected clip"><ArrowRight size={18} /></button>
            </div>
          )}
        </div>
        <div className="preview-details">
          <div className="preview-kicker"><span className={`provider-dot provider-dot--${video.provider.toLowerCase()}`} /> {video.provider} · {item.query}</div>
          <h2 id="preview-title">{video.title}</h2>
          {video.author && <p>Footage by {video.author}</p>}
          <dl className="preview-stats">
            <div><dt>Duration</dt><dd>{formatDuration(video.duration)}</dd></div>
            <div><dt>Resolution</dt><dd>{video.width && video.height ? `${video.width} × ${video.height}` : "Unknown"}</dd></div>
            <div><dt>Format</dt><dd>{video.orientation ?? "Unknown"}</dd></div>
            <div><dt>ClipScore</dt><dd>{video.clipScore ?? "—"}</dd></div>
          </dl>
          <div className="preview-actions">
            {video.downloadUrl && <a className="button button--accent" href={video.downloadUrl} target="_blank" rel="noreferrer"><ArrowDownToLine size={17} /> Download clip</a>}
            {video.providerUrl && <a className="button button--ghost" href={video.providerUrl} target="_blank" rel="noreferrer">Open on {video.provider} <ArrowUpRight size={17} /></a>}
          </div>
          <p className="provider-note">Provided by {video.provider}. Review the provider license before use.</p>
        </div>
      </section>
    </div>
  );
}
