import type { CurriculumModule, CurriculumTrack } from "./curriculum";

export function lessonSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\*/g, "star")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function moduleHref(track: CurriculumTrack, module: CurriculumModule): string {
  return `/learn/${track.id}/${module.id}`;
}

export function lessonHref(track: CurriculumTrack, module: CurriculumModule, topic: string): string {
  return `${moduleHref(track, module)}/${lessonSlug(topic)}`;
}

export function lessonId(track: CurriculumTrack, module: CurriculumModule, topic: string): string {
  return `${track.id}:${module.id}:${lessonSlug(topic)}`;
}
