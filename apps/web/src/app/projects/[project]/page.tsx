import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Code2,
  FlaskConical,
  GitBranch,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  TestTube2,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/ui/code-block";
import { projects } from "@/modules/learning/catalog";
import { getProject, getProjectBlueprint } from "@/modules/learning/project-blueprints";

export function generateStaticParams() {
  return projects.map((project) => ({ project: project.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }) {
  const values = await params;
  const project = getProject(values.project);
  return { title: project ? `${project.title} · Project` : "Project" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ project: string }> }) {
  const values = await params;
  const project = getProject(values.project);
  if (!project) notFound();
  const blueprint = getProjectBlueprint(project);
  const openIn = blueprint.starter.language === "c" || blueprint.starter.language === "cpp" ? "playground" : undefined;

  return (
    <article className="project-detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/projects"><ArrowLeft size={11} />Projects</Link><span>/</span><strong>{project.id}</strong>
      </nav>

      <header className="project-detail-hero">
        <div>
          <span className="eyebrow">BUILD / TEST / EXPLAIN</span>
          <h1>{project.title}</h1>
          <p>{blueprint.brief}</p>
          <div className="project-detail-tags">{project.skills.map((skill) => <code key={skill}>{skill}</code>)}</div>
        </div>
        <aside>
          <span>NÍVEL<strong>{project.level}</strong></span>
          <span>PLATAFORMA<strong>{project.platform}</strong></span>
          <span>ESTIMATIVA<strong><Clock3 size={12} />{project.estimatedHours} horas</strong></span>
          <span>MILESTONES<strong>{blueprint.milestones.length}</strong></span>
        </aside>
      </header>

      <section className="project-architecture">
        <header><GitBranch size={13} /><span>ARCHITECTURE PATH</span></header>
        <div>{blueprint.architecture.map((node, index) => <span key={node}><strong>{node}</strong>{index < blueprint.architecture.length - 1 ? <ArrowRight size={11} /> : null}</span>)}</div>
      </section>

      <section className="project-foundation-grid">
        <div>
          <span className="eyebrow"><ShieldCheck size={12} /> Invariantes</span>
          <h2>O que nunca pode deixar de ser verdade.</h2>
          {blueprint.invariants.map((invariant) => <p key={invariant}><Check size={12} />{invariant}</p>)}
        </div>
        <div>
          <span className="eyebrow"><Wrench size={12} /> Ferramentas de prova</span>
          <h2>Observe o sistema, não apenas o output.</h2>
          {blueprint.tools.map((tool) => <p key={tool}><Code2 size={12} />{tool}</p>)}
        </div>
      </section>

      <section className="project-starter">
        <div>
          <span className="eyebrow"><Code2 size={12} /> Starter mínimo</span>
          <h2>Comece com um vertical slice executável.</h2>
          <p>{blueprint.starter.explanation}</p>
        </div>
        <CodeBlock code={blueprint.starter.source} language={blueprint.starter.language} filename={blueprint.starter.filename} openIn={openIn} actionLabel="Open in Playground" />
      </section>

      <section className="project-milestones">
        <header>
          <div><span className="eyebrow"><Layers3 size={12} /> Build plan</span><h2>Seis entregas completas, não uma big bang implementation.</h2></div>
          <small>{project.estimatedHours}h estimadas · ajuste pela evidência</small>
        </header>
        <div>
          {blueprint.milestones.map((milestone) => (
            <article key={milestone.index}>
              <header><span>{milestone.index}</span><div><h3>{milestone.title}</h3><p>{milestone.objective}</p></div></header>
              <div className="milestone-build"><strong>CONSTRUA</strong><ol>{milestone.build.map((task) => <li key={task}>{task}</li>)}</ol></div>
              <aside><strong>PROVA DE CONCLUSÃO</strong><p>{milestone.proof}</p></aside>
              <footer><span>EDGE CASES</span>{milestone.edgeCases.map((edge) => <code key={edge}>{edge}</code>)}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="project-verification">
        <header><TestTube2 size={13} /><span>ACCEPTANCE TESTS</span><strong>{blueprint.publicTests.length} públicos + ocultos</strong></header>
        <div className="project-test-table">
          {blueprint.publicTests.map((test, index) => (
            <article key={test.name}><span>TEST {index + 1}</span><strong>{test.name}</strong><p>{test.setup}</p><small>{test.expected}</small></article>
          ))}
        </div>
        <aside><LockKeyhole size={13} /><div><strong>Testes ocultos</strong><p>{blueprint.hiddenTests}</p></div></aside>
      </section>

      <section className="project-experiments">
        <div>
          <span className="eyebrow"><FlaskConical size={12} /> Experimentos</span>
          <h2>Quebre, meça e explique.</h2>
          <ol>{blueprint.experiments.map((experiment, index) => <li key={experiment}><span>{String(index + 1).padStart(2, "0")}</span>{experiment}</li>)}</ol>
        </div>
        <aside>
          <span>FINAL DELIVERY</span>
          {blueprint.deliverables.map((deliverable) => <p key={deliverable}><Check size={11} />{deliverable}</p>)}
        </aside>
      </section>

      <section className="project-related">
        <header><span className="eyebrow">Pré-requisitos e revisão rápida</span><h2>Aulas conectadas ao projeto.</h2></header>
        <div>{blueprint.relatedLessons.map((lesson) => <Link href={lesson.href} key={`${lesson.label}-${lesson.href}`}><strong>{lesson.label}</strong><p>{lesson.reason}</p><ArrowRight size={11} /></Link>)}</div>
      </section>

      <footer className="project-detail-footer">
        <Link href="/projects"><ArrowLeft size={12} />Voltar ao catálogo</Link>
        <Link className="button-primary" href={`/playground?project=${project.id}`}>Abrir workspace<ArrowRight size={12} /></Link>
      </footer>
    </article>
  );
}

