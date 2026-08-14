"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useState } from "react";

const options = [
  { id: "a", text: "O valor inteiro armazenado em x" },
  { id: "b", text: "O endereço do primeiro byte ocupado por x" },
  { id: "c", text: "Uma cópia completa do objeto x" },
  { id: "d", text: "O tamanho de x em bytes" }
] as const;

export function Checkpoint() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = selected === "b";

  return (
    <section className="checkpoint">
      <div className="checkpoint-index">CHK<br />03.1</div>
      <div className="checkpoint-content">
        <span className="eyebrow">Verificação de modelo mental</span>
        <h3>O que a expressão <code>&amp;x</code> produz?</h3>
        <div className="checkpoint-options">
          {options.map((option) => (
            <label className="checkpoint-option" data-selected={selected === option.id} key={option.id}>
              <input
                type="radio"
                name="pointer-checkpoint"
                value={option.id}
                checked={selected === option.id}
                onChange={() => { setSelected(option.id); setSubmitted(false); }}
              />
              <span className="option-key">{option.id.toUpperCase()}</span>
              <span>{option.text}</span>
            </label>
          ))}
        </div>
        <div className="checkpoint-actions">
          <button className="button-primary" type="button" disabled={!selected} onClick={() => setSubmitted(true)}>Verificar resposta</button>
          <span>Sem penalidade · revisão ativa</span>
        </div>
        {submitted ? (
          <div className="checkpoint-feedback" data-correct={correct} role="status">
            {correct ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
            <div>
              <strong>{correct ? "Correto." : "Revise a diferença entre valor e endereço."}</strong>
              <p>&amp;x tem tipo <code>int*</code> e representa onde x começa na memória. Ele não lê os bytes que formam o valor 10.</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

