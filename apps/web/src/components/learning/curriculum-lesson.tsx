import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  Check,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  FlaskConical,
  GitBranch,
  Link2,
  Layers3,
  Map,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { LessonPracticeWorkbench } from "@/components/learning/lesson-practice-workbench";
import { PointerStepLab } from "@/components/learning/pointer-step-lab";
import type { CurriculumLessonRef } from "@/modules/learning/lesson-catalog";
import { getAdjacentLessons } from "@/modules/learning/lesson-catalog";
import type { ModuleGuide } from "@/modules/learning/lesson-guides";
import { lessonHref, lessonId, moduleHref } from "@/modules/learning/lesson-slugs";
import { getLessonStudy } from "@/modules/learning/lesson-study";
import { getTopicDepth } from "@/modules/learning/topic-depth";
import { CompleteLessonButton } from "@/components/progress/complete-lesson-button";
import { CodeBlock, type CodeDestination } from "@/components/ui/code-block";

interface CurriculumLessonProps {
  readonly lesson: CurriculumLessonRef;
  readonly guide: ModuleGuide;
}

function neighborHref(lesson: CurriculumLessonRef) {
  return lessonHref(lesson.track, lesson.module, lesson.topic);
}

function codeDestination(language: string, trackId: string): CodeDestination | undefined {
  if (language === "asm") return "low-level";
  if (language === "c" || language === "cpp") return trackId === "security-research" || trackId === "game-security" ? "low-level" : "playground";
  return undefined;
}

export function CurriculumLesson({ lesson, guide }: CurriculumLessonProps) {
  const { track, module, topic } = lesson;
  const topicIndex = module.topics.indexOf(topic);
  const adjacent = getAdjacentLessons(lesson);
  const topicNote = guide.topicNotes[topic];
  const isPointerLesson = track.id === "c" && module.id === "c-pointers" && topic === "pointers";
  const depth = getTopicDepth(lesson, guide);
  const study = getLessonStudy(lesson, guide);

  return (
    <div className="course-lesson-layout" data-tone={track.tone}>
      <article className="course-lesson-document">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/learn">Learn</Link><ChevronRight size={11} />
          <Link href={`/learn/${track.id}`}>{track.shortTitle}</Link><ChevronRight size={11} />
          <Link href={moduleHref(track, module)}>{module.title}</Link><ChevronRight size={11} />
          <strong>{module.index}.{topicIndex + 1}</strong>
        </nav>

        <header className="course-lesson-hero" id="overview">
          <div className="lesson-kicker"><span>{module.index}.{topicIndex + 1}</span><span>{track.kicker}</span><span>{depth.readingMinutes}–{depth.readingMinutes + 20} min</span></div>
          <h1>{topic}</h1>
          <p>{topicNote}</p>
          <div className="course-lesson-objectives">
            <span>Ao final, você será capaz de</span>
            <ul>
              <li><Check size={12} /> separar a semântica de <strong>{topic}</strong> de sua representação concreta;</li>
              <li><Check size={12} /> seguir {guide.flow.length} camadas, identificando estado, contrato e falha em cada fronteira;</li>
              <li><Check size={12} /> produzir evidência com código, trace e invariantes{depth.example ? ` no projeto “${depth.example.title}”` : " no experimento guiado"}.</li>
            </ul>
          </div>
          <div className="lesson-prerequisites">
            <span>PRÉ-REQUISITOS</span>
            <div>{study.prerequisites.map((item) => item.href
              ? <Link href={item.href} key={`${item.label}-${item.href}`}><Check size={10} />{item.label}</Link>
              : <span key={item.label}><Check size={10} />{item.label}</span>)}</div>
          </div>
        </header>

        <section className="course-lesson-section" id="model">
          <div className="course-section-marker"><span>01</span><i /></div>
          <div>
            <span className="eyebrow">Modelo mental</span>
            <h2>A ideia central antes dos detalhes.</h2>
            <p className="course-lead">{study.motivation}</p>
            <p>{guide.thesis}</p>
            {guide.context.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <aside className="course-focus-note"><BookOpen size={16} /><div><strong>Foco desta aula · {topic}</strong><p>{topicNote}</p></div></aside>
            <div className="real-use-strip">
              <strong>ONDE ISSO APARECE</strong>
              <div>{study.realUses.map((use) => <span key={use}>{use}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="layers">
          <div className="course-section-marker"><span>02</span><i /></div>
          <div>
            <span className="eyebrow"><Layers3 size={12} /> Conteúdo em camadas</span>
            <h2>Primeiro use. Depois abra a abstração.</h2>
            <p>As três leituras se complementam. Essential estabelece o contrato operacional; Deep Dive explica os mecanismos; Low-Level conecta o conceito ao artefato realmente executado.</p>
            <div className="study-layer-stack">
              {study.layers.map((layer, index) => (
                <article data-layer={layer.id} key={layer.id}>
                  <header><span>{String(index + 1).padStart(2, "0")}</span><strong>{layer.label}</strong></header>
                  <div><h3>{layer.title}</h3><p>{layer.explanation}</p></div>
                  <footer><span><Eye size={11} /> OBSERVE</span><p>{layer.inspect}</p><span><AlertTriangle size={11} /> LIMITE</span><p>{layer.caveat}</p></footer>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="dossier">
          <div className="course-section-marker"><span>03</span><i /></div>
          <div>
            <span className="eyebrow">Dossiê técnico do tópico</span>
            <h2>Definição, representação, mecanismo e prova.</h2>
            <p>Estas cinco lentes impedem que a aula pare na definição da API. Leia cada uma como uma pergunta de engenharia que precisa continuar respondida enquanto você altera o código.</p>
            <div className="topic-depth-grid">
              {depth.lenses.map((lens, index) => (
                <article key={lens.eyebrow}>
                  <header><span>{String(index + 1).padStart(2, "0")}</span><small>{lens.eyebrow}</small></header>
                  <h3>{lens.title}</h3>
                  <p>{lens.detail}</p>
                  <footer><GitBranch size={12} /><span>{lens.question}</span></footer>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="flow">
          <div className="course-section-marker"><span>04</span><i /></div>
          <div>
            <span className="eyebrow">Siga o evento</span>
            <h2>Da abstração ao estado que muda.</h2>
            <p>Use esta cadeia como roteiro de debugging: em cada fronteira, pergunte qual representação entra, qual contrato é aplicado e qual estado sai.</p>
            <div className="course-vertical-flow">
              {guide.flow.map((node, index) => <div key={`${node}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong>{index < guide.flow.length - 1 ? <i /> : null}</div>)}
            </div>
            <div className="course-bridge"><GitBranch size={14} /><span>CONCEPT BRIDGE</span><strong>{module.bridge}</strong></div>
            <div className="topic-transition-ledger" role="table" aria-label={`Contratos entre as camadas de ${topic}`}>
              <header role="row"><span>FRONTEIRA</span><span>CONTRATO / MECANISMO</span><span>EVIDÊNCIA</span><span>FALHA TÍPICA</span></header>
              {depth.transitions.map((transition, index) => (
                <div role="row" key={`${transition.from}-${transition.to}`}>
                  <div><small>{String(index + 1).padStart(2, "0")}</small><strong>{transition.from}<ArrowRight size={10} />{transition.to}</strong></div>
                  <p>{transition.contract}</p>
                  <p>{transition.evidence}</p>
                  <p>{transition.failure}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="examples">
          <div className="course-section-marker"><span>05</span><i /></div>
          <div>
            <span className="eyebrow"><Code2 size={12} /> Exemplos progressivos</span>
            <h2>Do caso mínimo ao uso que precisa sobreviver a falhas.</h2>
            <p>Não trate o primeiro snippet como uma receita. Em cada exemplo, escreva a saída esperada, execute, modifique uma entrada e explique por que o estado mudou.</p>
            <div className="lesson-example-series">
              {study.examples.map((example, index) => (
                <article className="lesson-example" key={example.id}>
                  <header><span>EXEMPLO {String(index + 1).padStart(2, "0")}</span><strong>{example.level}</strong></header>
                  <div className="lesson-example-intro"><h3>{example.title}</h3><p>{example.purpose}</p></div>
                  {example.code ? (
                    <CodeBlock
                      code={example.code.source}
                      language={example.code.language}
                      filename={example.code.filename}
                      lineExplanations={example.lineExplanations}
                      openIn={codeDestination(example.code.language, track.id)}
                      actionLabel={example.code.language === "asm" || track.id === "security-research" || track.id === "game-security" ? "Open in Low-Level Lab" : "Open in Playground"}
                    />
                  ) : null}
                  <div className="example-observation-grid">
                    <div><span>RESULTADO ESPERADO</span><p>{example.expected}</p></div>
                    <div><span>O QUE INSPECIONAR</span><ul>{example.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="visualization">
          <div className="course-section-marker"><span>06</span><i /></div>
          <div>
            <span className="eyebrow"><Map size={12} /> Visualize a transformação</span>
            <h2>{study.visualization.title}</h2>
            <p>{study.visualization.caption}</p>
            <div className="state-transition-visual" aria-label={`Estado antes e depois de ${topic}`}>
              <article><header>ANTES</header>{study.visualization.before.map((item) => <code key={item}>{item}</code>)}</article>
              <div><ArrowRight size={18} /><strong>{study.visualization.operation}</strong><ArrowRight size={18} /></div>
              <article><header>DEPOIS</header>{study.visualization.after.map((item) => <code key={item}>{item}</code>)}</article>
            </div>
            {isPointerLesson ? <div className="course-embedded-pointer-lab"><PointerStepLab /></div> : null}
          </div>
        </section>

        <section className="course-lesson-section" id="mechanics">
          <div className="course-section-marker"><span>07</span><i /></div>
          <div>
            <span className="eyebrow"><Cpu size={12} /> O que acontece por baixo</span>
            <h2>Mecanismo, código gerado e evidência.</h2>
            <div className="course-lesson-mechanics">
              {guide.mechanics.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></article>)}
            </div>
            <div className="generated-code-study">
              <header><span>CODE → MACHINE / RUNTIME</span><strong>{study.generatedCode.title}</strong></header>
              <CodeBlock code={study.generatedCode.generated.source} language={study.generatedCode.generated.language} filename={study.generatedCode.generated.filename} openIn={codeDestination(study.generatedCode.generated.language, track.id)} />
              <div className="generated-observations">{study.generatedCode.observations.map((observation) => <p key={observation}><Check size={11} />{observation}</p>)}</div>
              <aside><FlaskConical size={13} /><div><strong>Experimento</strong><p>{study.generatedCode.experiment}</p></div></aside>
              <small><AlertTriangle size={11} />{study.generatedCode.caveat}</small>
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="contracts">
          <div className="course-section-marker"><span>08</span><i /></div>
          <div>
            <span className="eyebrow"><Bug size={12} /> Contratos, erros e refactoring</span>
            <h2>Quebre o modelo de propósito; encontre a primeira violação.</h2>
            <p>Código incorreto é material de estudo. Antes de abrir a correção, identifique o objeto ou recurso envolvido, o contrato ausente e a primeira linha em que o estado deixa de ser válido.</p>
            <div className="course-invariant-list">
              {guide.invariants.map((item) => <p key={item}><ShieldCheck size={14} /><span>{item}</span></p>)}
            </div>
            <div className="mistake-study-list">
              {study.mistakes.map((mistake, index) => (
                <article className="mistake-study" key={mistake.title}>
                  <header><span>DEBUG CHALLENGE {String(index + 1).padStart(2, "0")}</span><h3>{mistake.title}</h3><p>{mistake.question}</p></header>
                  <div className="before-after-code">
                    <div><span><AlertTriangle size={11} /> CÓDIGO / RACIOCÍNIO PROBLEMÁTICO</span><CodeBlock code={mistake.wrong.source} language={mistake.wrong.language} filename={mistake.wrong.filename} openIn={codeDestination(mistake.wrong.language, track.id)} /></div>
                    <div><span><Check size={11} /> CORREÇÃO</span><CodeBlock code={mistake.corrected.source} language={mistake.corrected.language} filename={mistake.corrected.filename} openIn={codeDestination(mistake.corrected.language, track.id)} /></div>
                  </div>
                  <dl>
                    <div><dt>SINTOMA</dt><dd>{mistake.symptom}</dd></div>
                    <div><dt>CAUSA</dt><dd>{mistake.cause}</dd></div>
                    {mistake.diagnostic ? <div><dt>COMPILADOR / DEBUGGER</dt><dd>{mistake.diagnostic}</dd></div> : null}
                    <div><dt>TRADE-OFF</dt><dd>{mistake.tradeOff}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="practice">
          <div className="course-section-marker"><span>09</span><i /></div>
          <div>
            <span className="eyebrow"><FlaskConical size={12} /> Prever, implementar, testar e explicar</span>
            <h2>Prática em dificuldade crescente.</h2>
            <p>A solução não aparece de imediato. Registre primeiro uma hipótese ou estratégia; hints abrem um de cada vez e os casos públicos dizem o que deve permanecer verdadeiro sem entregar a implementação.</p>
            {module.lab ? <Link className="button-secondary course-lab-button" href={module.lab.href}>Abrir {module.lab.label}<ArrowRight size={13} /></Link> : null}
            <LessonPracticeWorkbench lessonId={lessonId(track, module, topic)} prediction={study.prediction} exercises={study.exercises} />
          </div>
        </section>

        {depth.example ? (
          <section className="course-lesson-section real-project-section" id="real-project">
            <div className="course-section-marker"><span>10</span><i /></div>
            <div>
              <span className="eyebrow"><Code2 size={12} /> Projeto real e reproduzível</span>
              <h2>{depth.example.title}</h2>
              <p className="course-lead">{depth.example.summary}</p>
              <div className="real-project-meta">
                <span><strong>PLATAFORMA</strong>{depth.example.platform}</span>
                <span><strong>NÍVEL</strong>{depth.example.level}</span>
                <span><strong>ARQUIVOS</strong>{depth.example.files.length}</span>
              </div>
              <div className="real-project-concepts">{depth.example.concepts.map((concept) => <code key={concept}>{concept}</code>)}</div>

              <div className="real-project-walkthrough">
                {depth.example.walkthrough.map((step, index) => (
                  <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></article>
                ))}
              </div>

              <div className="real-project-files">
                {depth.example.files.map((file) => (
                  <article key={file.filename}>
                    <CodeBlock code={file.source} language={file.language} filename={file.filename} lineExplanations={study.examples.find((example) => example.code?.language === file.language)?.lineExplanations} openIn={codeDestination(file.language, track.id)} />
                    <p>{file.explanation}</p>
                  </article>
                ))}
              </div>

              <div className="real-project-runbook">
                <span className="eyebrow">Build, execute e observe</span>
                <CodeBlock code={depth.example.commands.source} language={depth.example.commands.language} filename={depth.example.commands.filename} />
                <p>{depth.example.commands.explanation}</p>
                <aside className="course-evidence"><Layers3 size={15} /><div><strong>Saída esperada</strong><p>{depth.example.expected}</p></div></aside>
              </div>

              <div className="real-project-extensions">
                <strong>Próximas modificações</strong>
                <ol>{depth.example.extensions.map((extension, index) => <li key={extension}><span>{index + 1}</span>{extension}</li>)}</ol>
              </div>
            </div>
          </section>
        ) : null}

        <section className="course-lesson-section" id="review">
          <div className="course-section-marker"><span>11</span><i /></div>
          <div>
            <span className="eyebrow"><RotateCcw size={12} /> Recuperação ativa</span>
            <h2>Consegue explicar sem decorar?</h2>
            <p>Responda antes de abrir cada solução. Se a resposta não mencionar estado, fronteira e evidência, volte ao dossiê ou faça mais um passo no laboratório.</p>
            <ol className="review-question-list">{study.reviewQuestions.map((question, index) => <li key={question}><span>{String(index + 1).padStart(2, "0")}</span><p>{question}</p></li>)}</ol>
            <div className="topic-checkpoints">
              {depth.checkpoints.map((checkpoint, index) => (
                <details key={checkpoint.question}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{checkpoint.question}</strong><ArrowRight size={13} /></summary>
                  <p>{checkpoint.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="course-lesson-section" id="summary">
          <div className="course-section-marker"><span>12</span><i /></div>
          <div>
            <span className="eyebrow"><Link2 size={12} /> Resumo técnico e conexões</span>
            <h2>O que deve sobreviver ao fim da aula.</h2>
            <div className="technical-summary">
              {study.technicalSummary.map((item) => <p key={item}><Check size={12} /><span>{item}</span></p>)}
            </div>
            <div className="lesson-connections">
              <header><strong>RELACIONADO</strong><span>Abra a mesma ideia por outra camada.</span></header>
              <div>{study.connections.map((connection) => connection.href
                ? <Link href={connection.href} key={`${connection.label}-${connection.href}`}><strong>{connection.label}</strong><p>{connection.reason}</p><ArrowRight size={11} /></Link>
                : <article key={connection.label}><strong>{connection.label}</strong><p>{connection.reason}</p></article>)}</div>
            </div>
          </div>
        </section>

        <footer className="course-lesson-completion">
          <div><span>COMPLETE O CICLO</span><strong>Ver → prever → executar → quebrar → depurar → reconstruir.</strong><small>A conclusão exige evidência de previsão e tentativa; abrir a página não conta como domínio.</small></div>
          <CompleteLessonButton lessonId={lessonId(track, module, topic)} requiredExerciseCount={1} studyMinutes={depth.readingMinutes} />
        </footer>

        <nav className="course-page-navigation" aria-label="Navegação entre aulas">
          {adjacent.previous ? <Link href={neighborHref(adjacent.previous)}><ArrowLeft size={13} /><span><small>AULA ANTERIOR · {adjacent.previous.track.shortTitle}</small><strong>{adjacent.previous.topic}</strong></span></Link> : <Link href={moduleHref(track, module)}><ArrowLeft size={13} /><span><small>VISÃO DO MÓDULO</small><strong>{module.title}</strong></span></Link>}
          {adjacent.next ? <Link href={neighborHref(adjacent.next)}><span><small>PRÓXIMA AULA · {adjacent.next.track.shortTitle}</small><strong>{adjacent.next.topic}</strong></span><ArrowRight size={13} /></Link> : <Link href="/projects"><span><small>APLICAR</small><strong>Projetos finais</strong></span><ArrowRight size={13} /></Link>}
        </nav>
      </article>

      <aside className="course-lesson-outline">
        <span>NESSA AULA</span>
        <nav>
          <a href="#overview">Visão geral</a>
          <a href="#model">Modelo mental</a>
          <a href="#layers">Essential → Low-Level</a>
          <a href="#dossier">Dossiê técnico</a>
          <a href="#flow">Siga o evento</a>
          <a href="#examples">Exemplos</a>
          <a href="#visualization">Visualização</a>
          <a href="#mechanics">Internals / código gerado</a>
          <a href="#contracts">Erros e diagnóstico</a>
          <a href="#practice">Exercícios</a>
          {depth.example ? <a href="#real-project">Projeto real</a> : null}
          <a href="#review">Revisão</a>
          <a href="#summary">Resumo e conexões</a>
        </nav>
        <div><small>TRILHA</small><strong>{track.shortTitle}</strong><small>MÓDULO</small><strong>{module.index} / {track.modules.length}</strong><small>AULA</small><strong>{topicIndex + 1} / {module.topics.length}</strong></div>
        {module.lab ? <Link href={module.lab.href}>Abrir laboratório ↗</Link> : null}
      </aside>
    </div>
  );
}
