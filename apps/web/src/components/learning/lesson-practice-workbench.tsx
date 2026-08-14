"use client";

import {
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  FlaskConical,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Send,
  TestTube2
} from "lucide-react";
import { useState } from "react";
import { CodeBlock, type CodeDestination } from "@/components/ui/code-block";
import type { LessonExercise, PredictionStudy } from "@/modules/learning/lesson-study";

interface LessonPracticeWorkbenchProps {
  readonly lessonId: string;
  readonly prediction: PredictionStudy;
  readonly exercises: readonly LessonExercise[];
}

interface EvidenceState {
  readonly prediction?: boolean;
  readonly attempts?: readonly string[];
}

function destinationForLanguage(language: string): CodeDestination | undefined {
  if (language === "c" || language === "cpp" || language === "asm") return "low-level";
  return undefined;
}

function recordEvidence(lessonId: string, update: (current: EvidenceState) => EvidenceState) {
  const key = `0xlab.competence.${lessonId}`;
  let current: EvidenceState = {};
  try {
    current = JSON.parse(window.localStorage.getItem(key) ?? "{}") as EvidenceState;
  } catch {
    current = {};
  }
  const next = update(current);
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("0xlab:lesson-evidence", { detail: { lessonId, evidence: next } }));
}

export function LessonPracticeWorkbench({ lessonId, prediction, exercises }: LessonPracticeWorkbenchProps) {
  return (
    <div className="lesson-practice-workbench">
      <PredictionPanel lessonId={lessonId} prediction={prediction} />
      <div className="exercise-progression">
        {exercises.map((exercise) => <ExerciseCard exercise={exercise} lessonId={lessonId} key={exercise.id} />)}
      </div>
    </div>
  );
}

function PredictionPanel({ lessonId, prediction }: { readonly lessonId: string; readonly prediction: PredictionStudy }) {
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);

  function reveal() {
    if (draft.trim().length < 8) return;
    setRevealed(true);
    recordEvidence(lessonId, (current) => ({ ...current, prediction: true }));
  }

  return (
    <section className="prediction-panel">
      <header>
        <span><Eye size={13} /> PREDICT BEFORE RUN</span>
        <small>A resposta permanece oculta até você registrar uma hipótese.</small>
      </header>
      <div className="prediction-copy">
        <span className="eyebrow">{prediction.title}</span>
        <h3>{prediction.prompt}</h3>
      </div>
      <CodeBlock
        code={prediction.code.source}
        filename={prediction.code.filename}
        language={prediction.code.language}
        openIn={destinationForLanguage(prediction.code.language)}
      />
      <label className="prediction-input">
        <span>Sua previsão · valor, estado e motivo</span>
        <textarea
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setRevealed(false); }}
          placeholder="Antes de executar, descreva o que mudará e o que permanecerá igual…"
          rows={4}
        />
      </label>
      <div className="prediction-actions">
        <button className="button-primary" type="button" onClick={reveal} disabled={draft.trim().length < 8}>
          <Eye size={12} /> Conferir meu modelo
        </button>
        <span>{draft.trim().length < 8 ? "Escreva uma hipótese primeiro" : "Sua resposta não será substituída"}</span>
      </div>
      {revealed ? (
        <div className="prediction-answer" role="status">
          <Check size={15} />
          <div><strong>{prediction.answer}</strong><p>{prediction.explanation}</p></div>
        </div>
      ) : null}
    </section>
  );
}

function ExerciseCard({ lessonId, exercise }: { readonly lessonId: string; readonly exercise: LessonExercise }) {
  const [attempt, setAttempt] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [registered, setRegistered] = useState(false);
  const canRegister = attempt.trim().length >= 20;

  function registerAttempt() {
    if (!canRegister) return;
    setRegistered(true);
    recordEvidence(lessonId, (current) => ({
      ...current,
      attempts: [...new Set([...(current.attempts ?? []), exercise.id])]
    }));
  }

  return (
    <article className="exercise-card" data-kind={exercise.kind}>
      <header>
        <span className="exercise-level">NÍVEL {exercise.level}</span>
        <span className="exercise-kind"><FlaskConical size={11} />{exercise.kind}</span>
        <small>{exercise.id.split(":").at(-1)}</small>
      </header>
      <div className="exercise-copy">
        <h3>{exercise.title}</h3>
        <p>{exercise.prompt}</p>
        <aside><strong>Entregável</strong><span>{exercise.deliverable}</span></aside>
      </div>

      {exercise.starter ? (
        <CodeBlock
          code={exercise.starter.source}
          filename={exercise.starter.filename}
          language={exercise.starter.language}
          openIn={destinationForLanguage(exercise.starter.language)}
          actionLabel="Open in Low-Level Lab"
        />
      ) : null}

      <label className="exercise-attempt">
        <span>Sua estratégia antes da solução</span>
        <textarea
          rows={5}
          value={attempt}
          onChange={(event) => { setAttempt(event.target.value); setRegistered(false); setSolutionVisible(false); }}
          placeholder="Descreva invariantes, passos, edge cases e como você provará o resultado…"
        />
      </label>

      <div className="exercise-hints">
        <header><CircleHelp size={12} /><span>Ajuda progressiva</span><small>{hintCount} / 3 abertas</small></header>
        {exercise.hints.slice(0, hintCount).map((hint, index) => (
          <p key={hint}><span>HINT {index + 1}</span>{hint}</p>
        ))}
        {hintCount < exercise.hints.length ? (
          <button type="button" onClick={() => setHintCount((current) => Math.min(3, current + 1))}>
            <Lightbulb size={11} /> Abrir hint {hintCount + 1}
          </button>
        ) : null}
      </div>

      <section className="exercise-tests" aria-label={`Testes de ${exercise.title}`}>
        <header><TestTube2 size={12} /><span>Casos públicos</span><small>requisitos verificáveis</small></header>
        {exercise.tests.map((test, index) => (
          <div key={`${test.label}-${index}`}><span>TEST {index + 1}</span><strong>{test.label}</strong><p>{test.requirement}</p></div>
        ))}
        <footer><LockKeyhole size={11} /><strong>Testes ocultos</strong><span>{exercise.hiddenTests}</span></footer>
      </section>

      <div className="exercise-actions">
        <button className="button-secondary" type="button" onClick={registerAttempt} disabled={!canRegister || registered}>
          {registered ? <Check size={12} /> : <Send size={12} />}{registered ? "Tentativa registrada" : "Registrar tentativa"}
        </button>
        <button type="button" onClick={() => setSolutionVisible(true)} disabled={!canRegister || solutionVisible}>
          <KeyRound size={12} /> Show Solution
        </button>
        {!canRegister ? <small>Registre ao menos sua estratégia antes de abrir a solução.</small> : null}
      </div>

      {solutionVisible ? (
        <section className="exercise-solution">
          <header><KeyRound size={12} /><span>Solução comentada</span></header>
          {exercise.solution ? (
            <CodeBlock
              code={exercise.solution.source}
              filename={exercise.solution.filename}
              language={exercise.solution.language}
              openIn={destinationForLanguage(exercise.solution.language)}
            />
          ) : null}
          <div className="solution-reasoning">
            <p><strong>Raciocínio</strong>{exercise.reasoning}</p>
            <p><strong>Alternativas e trade-offs</strong>{exercise.alternatives}</p>
          </div>
        </section>
      ) : null}
      <footer className="exercise-next"><span>IMPLEMENTE</span><ChevronRight size={10} /><span>EXECUTE</span><ChevronRight size={10} /><span>QUEBRE</span><ChevronRight size={10} /><span>DEBUG</span><ChevronRight size={10} /><span>EXPLIQUE</span></footer>
    </article>
  );
}
