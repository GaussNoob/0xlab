import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  FlaskConical,
  GitBranch,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import type { CurriculumModule, CurriculumTrack } from "@/modules/learning/curriculum";
import type { ModuleGuide } from "@/modules/learning/lesson-guides";
import { lessonHref, moduleHref } from "@/modules/learning/lesson-slugs";
import { hasRealWorldExample } from "@/modules/learning/real-world-examples";
import { CodeBlock } from "@/components/ui/code-block";

interface ModuleOverviewProps {
  readonly track: CurriculumTrack;
  readonly module: CurriculumModule;
  readonly guide: ModuleGuide;
}

export function ModuleOverview({ track, module, guide }: ModuleOverviewProps) {
  const moduleIndex = track.modules.findIndex((item) => item.id === module.id);
  const previousModule = moduleIndex > 0 ? track.modules[moduleIndex - 1] : undefined;
  const nextModule = moduleIndex < track.modules.length - 1 ? track.modules[moduleIndex + 1] : undefined;

  return (
    <article className="course-module-page" data-tone={track.tone}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/learn">Learn</Link><ChevronRight size={11} />
        <Link href={`/learn/${track.id}`}>{track.shortTitle}</Link><ChevronRight size={11} />
        <strong>Módulo {module.index}</strong>
      </nav>

      <header className="course-module-hero">
        <div className="course-module-index">{module.index}</div>
        <div>
          <span className="eyebrow">{track.shortTitle} / module field guide</span>
          <h1>{module.title}</h1>
          <p>{guide.thesis}</p>
          <div className="course-hero-meta">
            <span><BookOpen size={12} />{module.topics.length} aulas completas</span>
            <span><GitBranch size={12} />{module.bridge}</span>
          </div>
        </div>
      </header>

      <section className="course-module-context">
        <div>
          <span className="eyebrow">Por que este módulo existe</span>
          <h2>Construa o mecanismo, depois use a abstração.</h2>
        </div>
        <div>{guide.context.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </section>

      <section className="course-flow-panel" aria-label="Fluxo do conceito">
        <header><span>FOLLOW THE EVENT</span><small>{module.bridge}</small></header>
        <div>{guide.flow.map((node, index) => <span key={`${node}-${index}`}><b>{node}</b>{index < guide.flow.length - 1 ? <ArrowRight size={12} /> : null}</span>)}</div>
      </section>

      <section className="course-topic-section">
        <header className="course-section-heading">
          <div><span className="eyebrow">Aulas deste módulo</span><h2>Abra um tópico e siga até a máquina.</h2></div>
          <span>{String(module.topics.length).padStart(2, "0")} TOPICS</span>
        </header>
        <div className="course-topic-grid">
          {module.topics.map((topic, index) => (
            <Link href={lessonHref(track, module, topic)} key={topic}>
              <span className="course-topic-number">{module.index}.{index + 1}</span>
              <div><code>{topic}</code><p>{guide.topicNotes[topic]}</p>{hasRealWorldExample(module.id, topic) ? <small className="course-topic-real-badge">projeto com código real</small> : null}</div>
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </section>

      <section className="course-module-deep-dive">
        <div className="course-module-code">
          <span className="eyebrow"><Code2 size={12} /> Artefato para inspecionar</span>
          <h2>Não aceite a explicação sem observar.</h2>
          <CodeBlock code={guide.code.source} language={guide.code.language} filename={guide.code.filename} />
          <p>{guide.code.explanation}</p>
        </div>
        <div className="course-mechanics-list">
          <span className="eyebrow">Mecanismo em quatro movimentos</span>
          {guide.mechanics.map((step, index) => (
            <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></article>
          ))}
        </div>
      </section>

      <section className="course-contract-grid">
        <article>
          <header><ShieldCheck size={14} /><span>INVARIANTS</span></header>
          {guide.invariants.map((item) => <p key={item}><Check size={11} />{item}</p>)}
        </article>
        <article>
          <header><FlaskConical size={14} /><span>PRÁTICA GUIADA</span></header>
          <h3>{guide.practice.prompt}</h3>
          <ol>{guide.practice.tasks.map((task) => <li key={task}>{task}</li>)}</ol>
          <small>EVIDÊNCIA · {guide.practice.evidence}</small>
          {module.lab ? <Link href={module.lab.href}>{module.lab.label}<ArrowRight size={12} /></Link> : null}
        </article>
      </section>

      <footer className="course-page-navigation">
        {previousModule ? <Link href={moduleHref(track, previousModule)}><ArrowLeft size={13} /><span><small>MÓDULO ANTERIOR</small><strong>{previousModule.title}</strong></span></Link> : <Link href={`/learn/${track.id}`}><ArrowLeft size={13} /><span><small>VOLTAR À TRILHA</small><strong>{track.title}</strong></span></Link>}
        {nextModule ? <Link href={moduleHref(track, nextModule)}><span><small>PRÓXIMO MÓDULO</small><strong>{nextModule.title}</strong></span><ArrowRight size={13} /></Link> : <Link href={lessonHref(track, module, module.topics[0]!)}><span><small>REVISAR</small><strong>Primeira aula do módulo</strong></span><ArrowRight size={13} /></Link>}
      </footer>
    </article>
  );
}
