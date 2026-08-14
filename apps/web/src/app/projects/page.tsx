import { ArrowRight, Clock3, Filter, Github, MonitorCog } from "lucide-react";
import Link from "next/link";
import { projects } from "@/modules/learning/catalog";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  const totalHours = projects.reduce((sum, project) => sum + project.estimatedHours, 0);

  return (
    <div className="projects-page">
      <header className="catalog-header compact-header">
        <div><span className="eyebrow">Build / inspect / explain</span><h1>Projetos de sistemas.</h1><p>Entregáveis reais, especificações verificáveis e post-mortem técnico. Cada projeto combina vários módulos.</p></div>
        <div className="project-summary"><span>{String(projects.length).padStart(2, "0")} AVAILABLE</span><strong>{totalHours}h</strong><small>estimated build time</small></div>
      </header>

      <div className="project-toolbar"><span>PROJECT INDEX</span><div><button type="button"><Filter size={11} />Todos os níveis</button><button type="button"><MonitorCog size={11} />Todas as plataformas</button></div></div>
      <div className="project-table" role="table" aria-label="Projetos">
        <div className="project-table-head" role="row"><span>ID</span><span>PROJETO</span><span>DOMÍNIOS</span><span>PLATAFORMA</span><span>ESTIMATIVA</span><span /></div>
        {projects.map((project, index) => (
          <article className="project-row" role="row" key={project.id}>
            <span className="project-id">P-{String(index + 1).padStart(2, "0")}</span>
            <div className="project-title"><span className="project-level" data-level={project.level}>{project.level}</span><strong>{project.title}</strong><p>{project.description}</p></div>
            <div className="project-skills">{project.skills.map((skill) => <code key={skill}>{skill}</code>)}</div>
            <span className="project-platform">{project.platform}</span>
            <span className="project-time"><Clock3 size={10} />{project.estimatedHours}h</span>
            <Link href={`/projects/${project.id}`} aria-label={`Abrir especificação de ${project.title}`}><ArrowRight size={14} /></Link>
          </article>
        ))}
      </div>
      <footer className="projects-footer"><div><Github size={14} /><span>Workspaces locais</span><p>Os projetos mantêm múltiplos arquivos e configuração de build. Exportação Git entra após a fundação do workspace.</p></div><Link className="button-secondary" href="/playground">Abrir workspace vazio <ArrowRight size={12} /></Link></footer>
    </div>
  );
}
