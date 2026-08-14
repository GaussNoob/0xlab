import {
  curriculumTracks,
  type CurriculumModule,
  type CurriculumTrack
} from "./curriculum";
import { lessonSlug } from "./lesson-slugs";

export interface CurriculumLessonRef {
  readonly track: CurriculumTrack;
  readonly module: CurriculumModule;
  readonly topic: string;
  readonly slug: string;
}

export const curriculumModules = curriculumTracks.flatMap((track) =>
  track.modules.map((module) => ({ track, module }))
);

export const curriculumLessons: readonly CurriculumLessonRef[] = curriculumTracks.flatMap((track) =>
  track.modules.flatMap((module) =>
    module.topics.map((topic) => ({ track, module, topic, slug: lessonSlug(topic) }))
  )
);

export function getCurriculumModule(trackId: string, moduleId: string) {
  const track = curriculumTracks.find((item) => item.id === trackId);
  const module = track?.modules.find((item) => item.id === moduleId);
  return track && module ? { track, module } : undefined;
}

export function getCurriculumLesson(trackId: string, moduleId: string, topicSlug: string): CurriculumLessonRef | undefined {
  return curriculumLessons.find((item) =>
    item.track.id === trackId && item.module.id === moduleId && item.slug === topicSlug
  );
}

export function getAdjacentLessons(current: CurriculumLessonRef) {
  const index = curriculumLessons.findIndex((item) =>
    item.track.id === current.track.id && item.module.id === current.module.id && item.slug === current.slug
  );
  return {
    previous: index > 0 ? curriculumLessons[index - 1] : undefined,
    next: index >= 0 && index < curriculumLessons.length - 1 ? curriculumLessons[index + 1] : undefined
  };
}
