import type { VideoResult } from "@/lib/stock-video";

export type SelectedClip = {
  key: string;
  query: string;
  video: VideoResult;
};

export type ClipProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  clips: SelectedClip[];
};

export const PROJECTS_STORAGE_KEY = "clipscout:projects:v1";
export const RECENT_SEARCHES_STORAGE_KEY = "clipscout:recent-searches:v1";
export const MAX_RECENT_SEARCHES = 15;

export function createProject(name: string): ClipProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled project",
    createdAt: now,
    updatedAt: now,
    clips: [],
  };
}

export function mergeProjectClips(project: ClipProject, clips: SelectedClip[]): ClipProject {
  const existing = new Map(project.clips.map((clip) => [clip.key, clip]));
  clips.forEach((clip) => existing.set(clip.key, clip));
  return { ...project, clips: [...existing.values()], updatedAt: new Date().toISOString() };
}
