"use client";

import { ArrowRight, BrainCircuit, Check, Clock3, Eye, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import type { ReviewCardDefinition } from "@/modules/learning/review-catalog";

type ReviewRating = "again" | "hard" | "good";

interface ReviewState {
  readonly dueAt: string;
  readonly intervalDays: number;
  readonly repetitions: number;
  readonly lastRating: ReviewRating;
}

interface SpacedReviewProps {
  readonly cards: readonly ReviewCardDefinition[];
}

const STORAGE_KEY = "0xlab.spaced-review.v1";

function nextInterval(current: ReviewState | undefined, rating: ReviewRating) {
  if (rating === "again") return 0;
  if (rating === "hard") return Math.max(1, Math.round((current?.intervalDays ?? 1) * 1.5));
  const previous = current?.intervalDays ?? 0;
  if (previous === 0) return 3;
  if (previous <= 3) return 7;
  return Math.min(60, Math.round(previous * 2.2));
}

function dueLabel(value: ReviewState | undefined) {
  if (!value) return "NOVA";
  const difference = new Date(value.dueAt).getTime() - Date.now();
  if (difference <= 0) return "AGORA";
  const days = Math.ceil(difference / 86_400_000);
  return days === 1 ? "AMANHÃ" : `${days} DIAS`;
}

export function SpacedReview({ cards }: SpacedReviewProps) {
  const [schedule, setSchedule] = useState<Readonly<Record<string, ReviewState>>>({});
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    try {
      setSchedule(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Readonly<Record<string, ReviewState>>);
    } catch {
      setSchedule({});
    }
  }, []);

  const ordered = useMemo(() => [...cards].sort((left, right) => {
    const leftTime = schedule[left.id] ? new Date(schedule[left.id]!.dueAt).getTime() : 0;
    const rightTime = schedule[right.id] ? new Date(schedule[right.id]!.dueAt).getTime() : 0;
    return leftTime - rightTime;
  }), [cards, schedule]);
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  const dueCount = cards.filter((card) => !schedule[card.id] || new Date(schedule[card.id]!.dueAt).getTime() <= Date.now()).length;

  function select(id: string) {
    setSelectedId(id);
    setDraft("");
    setRevealed(false);
  }

  function rate(rating: ReviewRating) {
    if (!selected) return;
    const current = schedule[selected.id];
    const intervalDays = nextInterval(current, rating);
    const due = new Date();
    if (rating === "again") due.setMinutes(due.getMinutes() + 10);
    else due.setDate(due.getDate() + intervalDays);
    const next = {
      ...schedule,
      [selected.id]: {
        dueAt: due.toISOString(),
        intervalDays,
        repetitions: (current?.repetitions ?? 0) + 1,
        lastRating: rating
      }
    };
    setSchedule(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const nextCard = ordered.find((card) => card.id !== selected.id && (!next[card.id] || new Date(next[card.id]!.dueAt).getTime() <= Date.now()));
    if (nextCard) select(nextCard.id);
  }

  if (!selected) return null;

  return (
    <div className="spaced-review-layout">
      <aside className="review-deck">
        <header><span>REVIEW QUEUE</span><strong>{String(dueCount).padStart(2, "0")}</strong><small>due now</small></header>
        {ordered.map((card) => (
          <button type="button" data-active={card.id === selected.id} onClick={() => select(card.id)} key={card.id}>
            <span>{dueLabel(schedule[card.id])}</span><div><strong>{card.topic}</strong><small>{card.track}</small></div><ArrowRight size={10} />
          </button>
        ))}
      </aside>

      <main className="review-session-card">
        <header><span><BrainCircuit size={13} /> ACTIVE RECALL</span><small>Sem pontos · apenas retenção e evidência</small></header>
        <div className="review-topic-heading">
          <div><span className="eyebrow">{selected.track}</span><h1>{selected.topic}</h1></div>
          <Link href={selected.href}>Reabrir aula <ArrowRight size={11} /></Link>
        </div>
        <section className="review-prompt">
          <span>EXPLIQUE ANTES DE REVELAR</span>
          <h2>{selected.prompt}</h2>
          {selected.code ? <CodeBlock code={selected.code} language={selected.language} filename="review.c" openIn={selected.language === "c" ? "playground" : undefined} /> : null}
          <label><span>Sua reconstrução</span><textarea rows={6} value={draft} onChange={(event) => { setDraft(event.target.value); setRevealed(false); }} placeholder="Desenhe o estado, declare o contrato e escreva sua resposta…" /></label>
          <button className="button-primary" type="button" disabled={draft.trim().length < 15} onClick={() => setRevealed(true)}><Eye size={12} />Revelar modelo técnico</button>
        </section>

        {revealed ? (
          <section className="review-reveal">
            <header><Check size={13} /><span>MODELO DE RESPOSTA</span></header>
            <p>{selected.answer}</p>
            <div>{selected.evidence.map((item) => <code key={item}>{item}</code>)}</div>
            <footer>
              <span>Quanto você reconstruiu sem consultar?</span>
              <button type="button" onClick={() => rate("again")}><RotateCcw size={11} />Ainda difícil<small>10 min</small></button>
              <button type="button" onClick={() => rate("hard")}><Clock3 size={11} />Quase<small>1+ dia</small></button>
              <button type="button" onClick={() => rate("good")}><Check size={11} />Consegui explicar<small>3+ dias</small></button>
            </footer>
          </section>
        ) : null}
      </main>
    </div>
  );
}

