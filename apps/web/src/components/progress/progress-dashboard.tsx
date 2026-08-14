"use client";

import type { ProgressSnapshot } from "@0xlab/contracts";
import { ArrowRight, Clock3, LoaderCircle, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { learningStats } from "@/modules/learning/catalog";
import { curriculumTotals } from "@/modules/learning/curriculum";
import { reviewCards } from "@/modules/learning/review-catalog";

const DAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
interface LocalCompetenceEvidence {
  readonly predictions: number;
  readonly exerciseAttempts: number;
}

function evidenceState(coverage: number) {
  if (coverage >= 75) return "estável";
  if (coverage >= 35) return "revisar";
  if (coverage > 0) return "em estudo";
  return "começar";
}

function percentage(value: number, total: number) {
  return Math.min(100, Math.round((value / Math.max(1, total)) * 100));
}

function readLocalCompetence(): LocalCompetenceEvidence {
  let predictions = 0;
  const attempts = new Set<string>();
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("0xlab.competence.")) continue;
    try {
      const evidence = JSON.parse(window.localStorage.getItem(key) ?? "{}") as { prediction?: boolean; attempts?: readonly string[] };
      if (evidence.prediction) predictions += 1;
      evidence.attempts?.forEach((attempt) => attempts.add(attempt));
    } catch {
      // Invalid browser evidence is ignored; the SQLite snapshot remains authoritative.
    }
  }
  return { predictions, exerciseAttempts: attempts.size };
}

export function ProgressDashboard() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localEvidence, setLocalEvidence] = useState<LocalCompetenceEvidence>({ predictions: 0, exerciseAttempts: 0 });

  useEffect(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível abrir o banco local.");
        return response.json() as Promise<ProgressSnapshot>;
      })
      .then(setSnapshot)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Erro de persistência."));
  }, []);

  useEffect(() => {
    const refresh = () => setLocalEvidence(readLocalCompetence());
    refresh();
    window.addEventListener("0xlab:lesson-evidence", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("0xlab:lesson-evidence", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  async function registerSession() {
    if (!snapshot) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...snapshot, studyMinutes: snapshot.studyMinutes + 25 })
      });
      if (!response.ok) throw new Error("A sessão não pôde ser salva.");
      setSnapshot(await response.json() as ProgressSnapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro de persistência.");
    } finally {
      setSaving(false);
    }
  }

  const completedLessons = snapshot?.completedLessonIds.length ?? 0;
  const exerciseAttempts = Math.max(localEvidence.exerciseAttempts, snapshot?.completedExerciseIds.length ?? 0);
  const completedChallenges = snapshot?.completedChallengeIds.length ?? 0;
  const lessonCoverage = percentage(completedLessons, curriculumTotals.lessons);
  const evidenceRows = [
    { name: "Aulas com evidência", value: `${completedLessons} / ${curriculumTotals.lessons}`, coverage: lessonCoverage },
    { name: "Previsões antes de executar", value: String(localEvidence.predictions), coverage: percentage(localEvidence.predictions, curriculumTotals.lessons) },
    { name: "Tentativas de exercício", value: String(exerciseAttempts), coverage: percentage(exerciseAttempts, curriculumTotals.lessons * 3) },
    { name: "Desafios registrados", value: String(completedChallenges), coverage: percentage(completedChallenges, curriculumTotals.projects) },
    { name: "Prática deliberada", value: `${Math.floor((snapshot?.studyMinutes ?? 0) / 60)}h ${(snapshot?.studyMinutes ?? 0) % 60}m`, coverage: percentage(snapshot?.studyMinutes ?? 0, 1_200) }
  ];

  return (
    <div className="progress-page">
      <header className="catalog-header compact-header">
        <div><span className="eyebrow">Progress / evidence</span><h1>O que você consegue explicar?</h1><p>Progresso mede prática verificada, retenção e tópicos a revisar — sem moedas, streaks piscando ou pontuação vazia.</p></div>
        <button className="button-secondary" type="button" onClick={registerSession} disabled={!snapshot || saving}>{saving ? <LoaderCircle className="spin" size={13} /> : <Clock3 size={13} />}Registrar sessão de 25 min</button>
      </header>

      {error ? <div className="progress-error">{error}</div> : null}
      <section className="progress-metrics">
        <Metric label="Lições" value={String(completedLessons)} suffix={`/ ${curriculumTotals.lessons}`} note={`${lessonCoverage}% com evidência`} />
        <Metric label="Prática verificada" value={String(exerciseAttempts)} suffix="tentativas" note={`${completedChallenges} desafios`} />
        <Metric label="Tempo local" value={snapshot ? `${Math.floor(snapshot.studyMinutes / 60)}h` : "—"} suffix={snapshot ? `${snapshot.studyMinutes % 60}m` : ""} note="persistido em SQLite" />
        <Metric label="Revisão" value={String(reviewCards.length)} suffix="tópicos" note="active recall espaçado" />
      </section>

      <div className="progress-grid">
        <section className="study-activity">
          <header className="section-bar"><span>Tempo de prática · últimos 7 dias</span><strong>6h 05m</strong></header>
          <div className="activity-chart">
            <div className="chart-y"><span>90m</span><span>60m</span><span>30m</span><span>0</span></div>
            <div className="bars">
              {learningStats.weeklyMinutes.map((minutes, index) => <div key={DAYS[index]}><span className="bar-value">{minutes || "—"}</span><i style={{ height: `${Math.max(2, (minutes / 100) * 100)}%` }} data-empty={minutes === 0} /><small>{DAYS[index]}</small></div>)}
            </div>
          </div>
        </section>

        <aside className="review-queue">
          <header className="section-bar"><span>Review queue</span><strong>{String(reviewCards.length).padStart(2, "0")}</strong></header>
          {reviewCards.slice(0, 4).map((card) => <div className="review-item priority" key={card.id}><span>HOJE</span><div><strong>{card.topic}</strong><small>{card.track}</small></div><i /></div>)}
          <Link className="review-open" href="/review"><RotateCcw size={11} />Abrir revisão ativa<ArrowRight size={11} /></Link>
        </aside>
      </div>

      <section className="mastery-table">
        <header className="section-bar"><span>Mapa de competência</span><span>atividade real, não abertura de página</span></header>
        <div className="mastery-head"><span>EVIDÊNCIA</span><span>COBERTURA</span><span>ESTADO</span></div>
        {evidenceRows.map((row, index) => (
          <div className="mastery-row" key={row.name}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{row.name}<small>{row.value}</small></strong>
            <div><i><b style={{ width: `${row.coverage}%` }} /></i><code>{row.coverage}%</code></div>
            <span data-state={evidenceState(row.coverage)} title={row.value}>{evidenceState(row.coverage)}</span>
          </div>
        ))}
      </section>

      <footer className="progress-db-state"><Save size={11} /><span>SQLite local</span><code>{snapshot ? `updated ${new Date(snapshot.updatedAt).toLocaleString("pt-BR")}` : "loading snapshot…"}</code></footer>
    </div>
  );
}

function Metric({ label, value, suffix, note }: { label: string; value: string; suffix: string; note: string }) {
  return <div><span>{label}</span><strong>{value}<small>{suffix}</small></strong><p>{note}</p></div>;
}
