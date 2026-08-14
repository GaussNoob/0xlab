import { notFound } from "next/navigation";
import { ModuleOverview } from "@/components/learning/module-overview";
import { curriculumModules, getCurriculumModule } from "@/modules/learning/lesson-catalog";
import { getModuleGuide } from "@/modules/learning/lesson-guides";

export function generateStaticParams() {
  return curriculumModules.map(({ track, module }) => ({ track: track.id, module: module.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ track: string; module: string }> }) {
  const values = await params;
  const entry = getCurriculumModule(values.track, values.module);
  return { title: entry ? `${entry.module.title} · ${entry.track.shortTitle}` : "Módulo" };
}

export default async function CurriculumModulePage({ params }: { params: Promise<{ track: string; module: string }> }) {
  const values = await params;
  const entry = getCurriculumModule(values.track, values.module);
  if (!entry) notFound();
  const guide = getModuleGuide(entry.module.id);
  if (!guide) notFound();
  return <ModuleOverview track={entry.track} module={entry.module} guide={guide} />;
}
