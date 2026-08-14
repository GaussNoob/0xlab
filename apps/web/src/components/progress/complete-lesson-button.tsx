"use client";

import type { ProgressSnapshot } from "@0xlab/contracts";
import { ArrowRight, BrainCircuit, Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface CompleteLessonButtonProps {
  readonly lessonId: string;
  readonly requiredExerciseCount?: number;
  readonly studyMinutes?: number;
}

interface LocalEvidence {
  readonly prediction?: boolean;
  readonly attempts?: readonly string[];
}

export function CompleteLessonButton({ lessonId, requiredExerciseCount = 0, studyMinutes = 36 }: CompleteLessonButtonProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [evidence, setEvidence] = useState<LocalEvidence>({});
  const requiresEvidence = requiredExerciseCount > 0;
  const unlocked = !requiresEvidence || (evidence.prediction === true && (evidence.attempts?.length ?? 0) >= requiredExerciseCount);

  useEffect(() => {
    const read = () => {
      try {
        setEvidence(JSON.parse(window.localStorage.getItem(`0xlab.competence.${lessonId}`) ?? "{}") as LocalEvidence);
      } catch {
        setEvidence({});
      }
    };
    const onEvidence = (event: Event) => {
      const detail = (event as CustomEvent<{ lessonId?: string }>).detail;
      if (detail?.lessonId === lessonId) read();
    };
    read();
    window.addEventListener("0xlab:lesson-evidence", onEvidence);
    return () => window.removeEventListener("0xlab:lesson-evidence", onEvidence);
  }, [lessonId]);

  async function completeLesson() {
    setState("saving");
    try {
      const currentResponse = await fetch("/api/progress", { cache: "no-store" });
      if (!currentResponse.ok) throw new Error("Unable to read progress");
      const current = await currentResponse.json() as ProgressSnapshot;
      const attempts = evidence.attempts ?? [];
      const completedExercises = attempts.filter((id) => !id.endsWith(":challenge"));
      const completedChallenges = attempts.filter((id) => id.endsWith(":challenge"));
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...current,
          completedLessonIds: [...new Set([...current.completedLessonIds, lessonId])],
          completedExerciseIds: [...new Set([...current.completedExerciseIds, ...completedExercises])],
          completedChallengeIds: [...new Set([...current.completedChallengeIds, ...completedChallenges])],
          lastLessonId: lessonId,
          studyMinutes: current.studyMinutes + studyMinutes
        })
      });
      if (!response.ok) throw new Error("Unable to save progress");
      setState("saved");
      window.dispatchEvent(new Event("0xlab:progress-updated"));
    } catch {
      setState("error");
    }
  }

  return (
    <div className="competence-completion">
      {requiresEvidence ? (
        <small data-ready={unlocked}>
          <BrainCircuit size={11} />
          {unlocked
            ? "Evidência mínima registrada"
            : `Previsão + ${requiredExerciseCount} tentativa${requiredExerciseCount > 1 ? "s" : ""} para concluir`}
        </small>
      ) : null}
      <button className="button-primary" type="button" onClick={completeLesson} disabled={!unlocked || state === "saving" || state === "saved"}>
        {state === "saving" ? <LoaderCircle className="spin" size={14} /> : state === "saved" ? <Check size={14} /> : <ArrowRight size={14} />}
        {state === "saving" ? "Salvando…" : state === "saved" ? "Lição concluída" : state === "error" ? "Tentar novamente" : "Marcar como concluída"}
      </button>
    </div>
  );
}
