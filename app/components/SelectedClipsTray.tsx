"use client";

import { Archive, ArrowDownToLine, ArrowUpRight, CheckCircle2, ChevronDown, ChevronUp, FolderPlus, Play, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { downloadableSelection, downloadSelectionZip, type ZipProgress, type ZipReport } from "@/lib/download-zip";
import type { SelectedClip } from "@/lib/workspace-types";

export function SelectedClipsTray({
  clips,
  onRemove,
  onClear,
  onPreview,
  onOpenProjects,
}: {
  clips: SelectedClip[];
  onRemove: (key: string) => void;
  onClear: () => void;
  onPreview: (index: number) => void;
  onOpenProjects: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState<ZipProgress>();
  const [report, setReport] = useState<ZipReport>();
  const [downloading, setDownloading] = useState(false);
  const batch = useMemo(() => downloadableSelection(clips), [clips]);

  async function handleDownload() {
    setDownloading(true);
    setExpanded(true);
    setReport(undefined);
    try {
      setReport(await downloadSelectionZip(clips, setProgress));
    } finally {
      setDownloading(false);
    }
  }

  if (!clips.length) return null;
  return (
    <aside className={`selection-tray ${expanded ? "selection-tray--expanded" : ""}`} aria-label="Selected clips">
      {expanded && (
        <div className="selection-panel">
          <div className="selection-panel__header">
            <div><span className="section-label">Your shortlist</span><h2>Selected B-roll</h2></div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse selected clips"><ChevronDown size={19} /></button>
          </div>
          <div className="selection-list">
            {clips.map((clip, index) => (
              <div className="selection-item" key={clip.key}>
                <button className="selection-thumb" type="button" onClick={() => onPreview(index)} aria-label={`Preview ${clip.video.title}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.video.thumbnailUrl} alt="" />
                  <Play size={15} fill="currentColor" />
                </button>
                <div><strong>{clip.video.title}</strong><span>{clip.query} · {clip.video.provider}</span></div>
                <button className="remove-item" type="button" onClick={() => onRemove(clip.key)} aria-label={`Remove ${clip.video.title}`}><X size={17} /></button>
              </div>
            ))}
          </div>
          {(progress || report) && (
            <div className="zip-status" aria-live="polite">
              <div className="zip-status__headline">
                {progress?.phase === "complete" ? <CheckCircle2 size={17} /> : <Archive size={17} />}
                <strong>{progress?.message ?? "Download summary"}</strong>
                {progress && <span>{progress.current} / {progress.total}</span>}
              </div>
              {progress && progress.phase !== "complete" && <progress value={progress.current} max={progress.total || 1} />}
              {report && <p>{report.added} clips added to ZIP. {report.excluded.length} {report.excluded.length === 1 ? "clip requires" : "clips require"} the original source.</p>}
              {report?.excluded.length ? (
                <div className="zip-exclusions">
                  {report.excluded.map(({ clip, reason }) => (
                    <a key={`${clip.key}:${reason}`} href={clip.video.providerUrl} target="_blank" rel="noreferrer">
                      {clip.video.title} <span>{reason}</span> <ArrowUpRight size={13} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
      <div className="selection-bar">
        <button className="selection-count" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          <span>{clips.length}</span>
          <div><strong>{clips.length} {clips.length === 1 ? "clip" : "clips"} selected</strong><small>{batch.eligible.length} ZIP-ready · {new Set(clips.map((clip) => clip.video.provider)).size} sources</small></div>
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <div className="selection-actions">
          <button type="button" onClick={() => onPreview(0)}><Play size={16} /> Preview selected</button>
          <button type="button" onClick={onOpenProjects}><FolderPlus size={16} /> Save to project</button>
          <button className="selection-primary" type="button" disabled={downloading || !batch.eligible.length} onClick={handleDownload}>
            <ArrowDownToLine size={16} /> {downloading ? "Preparing…" : "Download all"}
          </button>
          <button className="clear-selection" type="button" onClick={onClear} aria-label="Clear selection"><Trash2 size={17} /></button>
        </div>
      </div>
    </aside>
  );
}
