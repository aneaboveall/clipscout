"use client";

import { Check, Edit3, Folder, FolderPlus, Play, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClipProject, SelectedClip } from "@/lib/workspace-types";

export function ProjectsPanel({
  open,
  projects,
  selected,
  onClose,
  onCreate,
  onRename,
  onDelete,
  onAddSelected,
  onRemoveClip,
  onPreview,
}: {
  open: boolean;
  projects: ClipProject[];
  selected: SelectedClip[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddSelected: (id: string) => void;
  onRemoveClip: (projectId: string, clipKey: string) => void;
  onPreview: (clips: SelectedClip[], index: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [activeId, setActiveId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const active = projects.find((project) => project.id === activeId) ?? projects[0];
  const grouped = useMemo(() => {
    const groups = new Map<string, SelectedClip[]>();
    for (const clip of active?.clips ?? []) groups.set(clip.query, [...(groups.get(clip.query) ?? []), clip]);
    return [...groups.entries()];
  }, [active]);

  if (!open) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="projects-panel" role="dialog" aria-modal="true" aria-labelledby="projects-title">
        <header>
          <div><span className="section-label">Local workspace</span><h2 id="projects-title">Projects</h2></div>
          <button type="button" onClick={onClose} aria-label="Close projects"><X size={20} /></button>
        </header>
        <form
          className="new-project"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newName.trim()) return;
            onCreate(newName);
            setNewName("");
          }}
        >
          <FolderPlus size={17} />
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New project name" maxLength={60} aria-label="New project name" />
          <button type="submit">Create</button>
        </form>
        {!projects.length ? (
          <div className="projects-empty"><Folder size={25} /><h3>Create your first project</h3><p>Save clip metadata and source links without storing video files.</p></div>
        ) : (
          <div className="projects-layout">
            <nav className="project-list" aria-label="Projects">
              {projects.map((project) => (
                <button key={project.id} type="button" className={active?.id === project.id ? "active" : ""} onClick={() => setActiveId(project.id)}>
                  <Folder size={16} /><span><strong>{project.name}</strong><small>{project.clips.length} clips</small></span>
                </button>
              ))}
            </nav>
            {active && (
              <section className="project-detail">
                <div className="project-detail__header">
                  {editingId === active.id ? (
                    <form onSubmit={(event) => { event.preventDefault(); onRename(active.id, editingName); setEditingId(undefined); }}>
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label="Project name" />
                      <button type="submit" aria-label="Save project name"><Check size={16} /></button>
                    </form>
                  ) : <h3>{active.name}</h3>}
                  <div>
                    <button type="button" onClick={() => { setEditingId(active.id); setEditingName(active.name); }} aria-label="Rename project"><Edit3 size={15} /></button>
                    <button type="button" onClick={() => onDelete(active.id)} aria-label="Delete project"><Trash2 size={15} /></button>
                  </div>
                </div>
                {selected.length > 0 && <button className="save-selected" type="button" onClick={() => onAddSelected(active.id)}><FolderPlus size={16} /> Add {selected.length} selected {selected.length === 1 ? "clip" : "clips"}</button>}
                {!active.clips.length ? <p className="project-placeholder">No clips yet. Select footage and add it here.</p> : grouped.map(([query, clips]) => (
                  <div className="project-group" key={query}>
                    <h4>{query}<span>{clips.length}</span></h4>
                    <div>
                      {clips.map((clip, index) => (
                        <article key={clip.key}>
                          <button type="button" className="project-thumb" onClick={() => onPreview(clips, index)} aria-label={`Preview ${clip.video.title}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={clip.video.thumbnailUrl} alt="" /><Play size={14} fill="currentColor" />
                          </button>
                          <span><strong>{clip.video.title}</strong><small>{clip.video.provider}</small></span>
                          <button type="button" onClick={() => onRemoveClip(active.id, clip.key)} aria-label={`Remove ${clip.video.title}`}><X size={15} /></button>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
