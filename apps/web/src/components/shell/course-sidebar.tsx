"use client";

import type { ProgressSnapshot } from "@0xlab/contracts";
import { Check, ChevronRight, Circle, LockKeyhole, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cModules } from "@/modules/learning/catalog";
import { curriculumTracks, getCurriculumTrack } from "@/modules/learning/curriculum";
import { lessonHref, lessonId } from "@/modules/learning/lesson-slugs";

function LessonIcon({ status }: { status: "completed" | "current" | "available" | "locked" }) {
  if (status === "completed") return <Check size={12} strokeWidth={2} />;
  if (status === "locked") return <LockKeyhole size={10} strokeWidth={1.7} />;
  return <Circle fill={status === "current" ? "currentColor" : "none"} size={9} strokeWidth={1.5} />;
}

export function CourseSidebar() {
  const pathname = usePathname();
  const [completedLessonIds, setCompletedLessonIds] = useState<readonly string[]>([]);
  const trackId = pathname.startsWith("/labs/assembly") || pathname.startsWith("/labs/compiler")
    ? "assembly"
    : pathname.startsWith("/labs/windows")
      ? "windows"
      : pathname.startsWith("/labs/graphics")
        ? "graphics"
        : pathname.startsWith("/labs/memory")
          ? "memory"
          : pathname.startsWith("/labs/network")
            ? "networking"
            : pathname.split("/")[2] || "c";
  const selectedTrack = getCurriculumTrack(trackId) ?? getCurriculumTrack("c")!;
  const isLegacyCPath = pathname === "/learn/c/pointers";
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const isTopicComplete = useCallback((moduleId: string, topic: string) => {
    const module = selectedTrack.modules.find((item) => item.id === moduleId);
    if (!module) return false;
    return completedSet.has(lessonId(selectedTrack, module, topic)) ||
      (selectedTrack.id === "c" && moduleId === "c-pointers" && topic === "pointers" && completedSet.has("pointer-address"));
  }, [completedSet, selectedTrack]);
  const publishedLessonCount = selectedTrack.modules.reduce((count, module) => count + module.topics.length, 0);
  const completedTrackCount = selectedTrack.modules.reduce(
    (count, module) => count + module.topics.filter((topic) => isTopicComplete(module.id, topic)).length,
    0
  );
  const trackProgress = publishedLessonCount === 0 ? 0 : Math.round((completedTrackCount / publishedLessonCount) * 100);

  const refreshProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/progress", { cache: "no-store" });
      if (!response.ok) return;
      const snapshot = await response.json() as ProgressSnapshot;
      setCompletedLessonIds(snapshot.completedLessonIds);
    } catch {
      // Progress is supplemental navigation state; the curriculum remains usable offline.
    }
  }, []);

  useEffect(() => {
    void refreshProgress();
    const handleProgressUpdate = () => { void refreshProgress(); };
    window.addEventListener("0xlab:progress-updated", handleProgressUpdate);
    return () => window.removeEventListener("0xlab:progress-updated", handleProgressUpdate);
  }, [refreshProgress]);

  return (
    <aside className="course-sidebar" aria-label="Conteúdo da trilha">
      <div className="sidebar-heading">
        <span>Explorer / {selectedTrack.shortTitle}</span>
        <button className="icon-button" type="button" aria-label="Opções da trilha">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="sidebar-track-summary">
        <p className="sidebar-track-title">{selectedTrack.id}-to-hardware</p>
        <div className="sidebar-progress-line">
          <div className="mini-progress" aria-label={`${trackProgress}% concluído`}>
            <span style={{ width: `${trackProgress}%` }} />
          </div>
          <span>{trackProgress}%</span>
        </div>
      </div>

      <div className="module-tree">
        {isLegacyCPath ? cModules.map((module) => {
          const shouldOpen = module.id === "c-pointers" || module.progress > 0;
          return (
            <details className="tree-module" key={module.id} open={shouldOpen}>
              <summary>
                <ChevronRight className="tree-chevron" size={12} />
                <span className="tree-index">{module.index}</span>
                <span className="tree-module-title">{module.title}</span>
                <span className="tree-module-progress">{module.progress}%</span>
              </summary>
              {module.lessons.length > 0 ? (
                <div className="tree-lessons">
                  {module.lessons.map((lesson) => {
                    const href = lesson.href ?? `/learn#${lesson.slug}`;
                    const current = pathname === href || lesson.status === "current";
                    return (
                      <Link
                        className="tree-lesson"
                        data-current={current}
                        data-disabled={lesson.status === "locked"}
                        href={lesson.status === "locked" ? "#" : href}
                        key={lesson.id}
                        aria-disabled={lesson.status === "locked"}
                      >
                        <span className="lesson-state"><LessonIcon status={lesson.status} /></span>
                        <span>{lesson.title}</span>
                        <span className="lesson-duration">{lesson.durationMinutes}m</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </details>
          );
        }) : selectedTrack.modules.map((module, moduleIndex) => (
          <details className="tree-module" key={module.id} open={moduleIndex < 2 || pathname.includes(module.id)}>
            <summary>
              <ChevronRight className="tree-chevron" size={12} />
              <span className="tree-index">{module.index}</span>
              <span className="tree-module-title">{module.title}</span>
              <span className="tree-module-progress">{module.topics.length}L</span>
            </summary>
            <div className="tree-lessons">
              {module.topics.map((topic) => {
                const href = lessonHref(selectedTrack, module, topic);
                const current = pathname === href;
                const completed = isTopicComplete(module.id, topic);
                return (
                <Link className="tree-lesson" data-current={current} href={href} key={topic}>
                  <span className="lesson-state"><LessonIcon status={completed ? "completed" : current ? "current" : "available"} /></span>
                  <span>{topic}</span>
                </Link>
              );})}
              {module.lab ? (
                <Link className="tree-lesson sidebar-lab-link" href={module.lab.href}>
                  <span className="lesson-state"><Circle size={8} fill="currentColor" /></span>
                  <span>{module.lab.label}</span>
                  <span className="lesson-duration">LAB</span>
                </Link>
              ) : null}
            </div>
          </details>
        ))}
        {!isLegacyCPath ? (
          <div className="sidebar-track-switcher">
            <span>OUTRAS TRILHAS</span>
            {curriculumTracks.filter((track) => track.id !== selectedTrack.id).slice(0, 6).map((track) => (
              <Link href={track.href} key={track.id}>{track.shortTitle}<ChevronRight size={10} /></Link>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
