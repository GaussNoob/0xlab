import { notFound } from "next/navigation";
import { CurriculumLesson } from "@/components/learning/curriculum-lesson";
import { curriculumLessons, getCurriculumLesson } from "@/modules/learning/lesson-catalog";
import { getModuleGuide } from "@/modules/learning/lesson-guides";

export function generateStaticParams() {
  return curriculumLessons.map(({ track, module, slug }) => ({
    track: track.id,
    module: module.id,
    topic: slug
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ track: string; module: string; topic: string }> }) {
  const values = await params;
  const lesson = getCurriculumLesson(values.track, values.module, values.topic);
  return { title: lesson ? `${lesson.topic} · ${lesson.track.shortTitle}` : "Aula" };
}

export default async function CurriculumTopicPage({ params }: { params: Promise<{ track: string; module: string; topic: string }> }) {
  const values = await params;
  const lesson = getCurriculumLesson(values.track, values.module, values.topic);
  if (!lesson) notFound();
  const guide = getModuleGuide(lesson.module.id);
  if (!guide) notFound();
  return <CurriculumLesson lesson={lesson} guide={guide} />;
}
