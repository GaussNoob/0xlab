import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  ArrowRight,
  Binary,
  Boxes,
  Braces,
  Cpu,
  FlaskConical,
  Gamepad2,
  MemoryStick,
  Network,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { curriculumTotals, curriculumTracks } from "@/modules/learning/curriculum";

const iconByTrack: Readonly<Record<string, LucideIcon>> = {
  c: Braces,
  cpp: Cpu,
  assembly: Binary,
  systems: Cpu,
  windows: AppWindow,
  linux: Terminal,
  memory: MemoryStick,
  networking: Network,
  graphics: Boxes,
  "reverse-engineering": ScanSearch,
  cybersecurity: ShieldCheck,
  "security-research": ShieldAlert,
  "game-security": Gamepad2
};

const learningChains = [
  { title: "Uma função até a CPU", nodes: ["C++", "Compiler", "Assembly", "Machine code", "CPU", "Memory"], tone: "cyan" },
  { title: "Uma janela até a tela", nodes: ["C++", "Win32 / SDL3", "Graphics API", "Driver", "GPU", "Monitor"], tone: "violet" },
  { title: "Um arquivo até o hardware", nodes: ["CreateFile", "Win32", "Native API", "Kernel", "Driver", "Storage"], tone: "amber" },
  { title: "Uma vulnerabilidade até a defesa", nodes: ["C bug", "Memory", "Sanitizer", "Patch", "Mitigation", "Detection"], tone: "rose" },
  { title: "Um cheat até a proteção", nodes: ["Game state", "Memory", "Research tool", "Detection", "Server", "Harden"], tone: "amber" }
] as const;

export const metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <div className="catalog-page curriculum-page">
      <header className="catalog-header curriculum-hero">
        <div>
          <span className="eyebrow">Computer engineering curriculum / 2026.08</span>
          <h1>Do source ao silício.<br />Sem caixas-pretas.</h1>
          <p>Uma base única para C, C++, Assembly, sistemas, Windows, Linux, redes, gráficos, engenharia reversa, cibersegurança, research de malware sintético e game security. Cada trilha volta a conectar linguagem, memória, sistema operacional, driver e hardware.</p>
          <div className="curriculum-hero-actions">
            <Link className="button-primary" href="/learn/assembly">Começar por Assembly <ArrowRight size={13} /></Link>
            <Link className="button-secondary" href="/labs">Explorar laboratórios <FlaskConical size={13} /></Link>
          </div>
        </div>
        <div className="curriculum-totals" aria-label="Resumo do currículo">
          <div><strong>{curriculumTracks.length}</strong><span>trilhas conectadas</span></div>
          <div><strong>{curriculumTotals.lessons}</strong><span>lições</span></div>
          <div><strong>{curriculumTotals.labs}</strong><span>laboratórios</span></div>
          <div><strong>{curriculumTotals.projects}</strong><span>projetos</span></div>
        </div>
      </header>

      <section className="curriculum-section">
        <header className="section-bar"><span>Knowledge map</span><span>{curriculumTracks.length} domains · one connected machine model</span></header>
        <div className="curriculum-domain-list">
          {curriculumTracks.map((track, index) => {
            const Icon = iconByTrack[track.id] ?? Cpu;
            return (
              <Link className="curriculum-domain-row" data-tone={track.tone} href={track.href} id={track.id} key={track.id}>
                <span className="domain-order">{String(index + 1).padStart(2, "0")}</span>
                <span className="curriculum-domain-icon"><Icon size={17} strokeWidth={1.5} /></span>
                <div className="domain-title">
                  <strong>{track.title}</strong>
                  <span>{track.modules.slice(0, 3).map((module) => module.title).join(" · ")}</span>
                </div>
                <div className="curriculum-domain-metrics"><span>{track.modules.length} modules</span><span>{track.modules.reduce((count, module) => count + module.topics.length, 0)} lessons</span><span>{track.labs} labs</span></div>
                <span className="track-level">{track.level}</span>
                <ArrowRight size={14} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="learning-chains">
        <header className="curriculum-titlebar">
          <div><span className="eyebrow">Concept bridges</span><h2>Aprenda seguindo o fluxo real.</h2></div>
          <p>O ponto de chegada de uma trilha é o ponto de partida da próxima.</p>
        </header>
        <div className="learning-chain-grid">
          {learningChains.map((chain) => (
            <article className="learning-chain" data-tone={chain.tone} key={chain.title}>
              <span>{chain.title}</span>
              <div>{chain.nodes.map((node, index) => <span key={node}><b>{node}</b>{index < chain.nodes.length - 1 ? <ArrowRight size={11} /> : null}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="advanced-track-cards">
        {curriculumTracks.filter((track) => ["assembly", "windows", "graphics", "security-research", "game-security"].includes(track.id)).map((track) => {
          const Icon = iconByTrack[track.id] ?? Cpu;
          return (
            <article data-tone={track.tone} key={track.id}>
              <header><Icon size={18} /><span>{track.kicker}</span></header>
              <h2>{track.shortTitle}</h2>
              <p>{track.description}</p>
              <div>{track.outcomes.slice(0, 3).map((outcome) => <span key={outcome}>{outcome}</span>)}</div>
              <Link href={track.href}>Abrir trilha de {track.shortTitle} <ArrowRight size={12} /></Link>
            </article>
          );
        })}
      </section>

      <section className="learning-principles">
        <div><span>01</span><strong>Observe</strong><p>Veja bytes, endereços, registradores, syscalls, comandos e pixels mudarem durante um trace.</p></div>
        <div><span>02</span><strong>Prediga</strong><p>Declare o estado esperado antes de executar. O modelo mental vem primeiro.</p></div>
        <div><span>03</span><strong>Execute</strong><p>Trabalhe com toolchains reais e simulações determinísticas em ambientes limitados.</p></div>
        <div><span>04</span><strong>Conecte</strong><p>Explique o mesmo evento na linguagem, no compilador, no SO e no hardware.</p></div>
      </section>
    </div>
  );
}
