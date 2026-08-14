"use client";

import { Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";

const sections = [
  ["mental-model", "Modelo mental"],
  ["address", "O endereço"],
  ["dereference", "Indireção"],
  ["visualization", "Trace visual"],
  ["checkpoint", "Checkpoint"],
  ["internals", "O que ocorreu internamente"]
] as const;

export function LessonOutline() {
  const [active, setActive] = useState("mental-model");

  useEffect(() => {
    const observers = sections.map(([id]) => {
      const element = document.getElementById(id);
      if (!element) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry?.isIntersecting) setActive(id); },
        { root: null, rootMargin: "-20% 0px -65%", threshold: 0 }
      );
      observer.observe(element);
      return observer;
    });
    return () => observers.forEach((observer) => observer?.disconnect());
  }, []);

  return (
    <aside className="lesson-outline">
      <span className="outline-label">Nesta lição</span>
      <nav>
        {sections.map(([id, label], index) => (
          <a href={`#${id}`} data-active={active === id} key={id}>
            <span>{index === 0 && active !== id ? <Check size={10} /> : <Circle size={7} fill={active === id ? "currentColor" : "none"} />}</span>
            {label}
          </a>
        ))}
      </nav>
      <div className="outline-meta">
        <div><span>Tempo estimado</span><strong>36 min</strong></div>
        <div><span>Dificuldade</span><strong>Intermediário</strong></div>
        <div><span>Compilador</span><strong>GCC / Clang</strong></div>
      </div>
      <a className="outline-lab-link" href="/labs/memory">Abrir no Memory Lab <span>↗</span></a>
    </aside>
  );
}

