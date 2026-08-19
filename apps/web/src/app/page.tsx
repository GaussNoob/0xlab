import { ArrowRight, Braces, ChevronRight, Clock3, Container, Cpu, Gamepad2, MemoryStick, Network, Play, ShieldCheck, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { PointerMiniDiagram } from "@/components/learning/pointer-mini-diagram";
import { learningStats } from "@/modules/learning/catalog";
import { curriculumTotals, getCurriculumTrack } from "@/modules/learning/curriculum";
import { reviewCards } from "@/modules/learning/review-catalog";

function lessonCount(...trackIds: readonly string[]) {
  return trackIds.reduce((total, id) => total + (getCurriculumTrack(id)?.modules.reduce((count, module) => count + module.topics.length, 0) ?? 0), 0);
}

function completion(completed: number, total: number) {
  return Math.round((completed / Math.max(1, total)) * 100);
}

export default function HomePage() {
  const cLessons = lessonCount("c");
  const cppLessons = lessonCount("cpp");
  const networkLessons = lessonCount("networking");
  const reverseLessons = lessonCount("reverse-engineering", "cybersecurity", "security-research");
  const gameLessons = lessonCount("game-security");
  return (
    <div className="workbench-home">
      <header className="workbench-heading">
        <div>
          <span className="eyebrow">Thursday · focused session</span>
          <h1>Continue de onde o modelo<br />de memória ficou interessante.</h1>
        </div>
        <div className="session-clock"><Clock3 size={14} /><span>Sessão atual</span><strong>00:42:18</strong></div>
      </header>

      <section className="resume-workbench">
        <div className="resume-copy">
          <div className="resume-path"><span>C CORE</span><ChevronRight size={11} /><span>03 · POINTERS</span><ChevronRight size={11} /><strong>03.1</strong></div>
          <h2>Ponteiros: endereço e indireção</h2>
          <p>Visualize como uma escrita por <code>*ptr</code> atravessa o endereço armazenado e altera o objeto original na stack.</p>
          <div className="resume-meta"><span>38% do módulo</span><i><b style={{ width: "38%" }} /></i><span>14 min restantes</span></div>
          <div className="resume-actions">
            <Link className="button-primary" href="/learn/c/c-pointers/pointers"><Play size={13} fill="currentColor" />Continuar lição</Link>
            <Link className="button-secondary" href="/labs/memory"><MemoryStick size={13} />Abrir no Memory Lab</Link>
          </div>
        </div>
        <PointerMiniDiagram />
      </section>

      <div className="home-grid">
        <section className="system-lanes">
          <header className="section-bar"><span>Learning lanes</span><Link href="/learn">Ver currículo <ArrowRight size={11} /></Link></header>
          <Lane index="01" icon={Braces} title="C · source to machine" meta={`11 / ${cLessons} lessons`} progress={completion(11, cLessons)} tone="cyan" href="/learn/c" />
          <Lane index="02" icon={Cpu} title="Modern C++ · ownership" meta={`3 / ${cppLessons} lessons`} progress={completion(3, cppLessons)} tone="violet" href="/learn/cpp" />
          <Lane index="03" icon={Network} title="Networks · sockets & protocols" meta={`0 / ${networkLessons} lessons`} progress={0} tone="green" href="/learn/networking" />
          <Lane index="04" icon={ShieldCheck} title="Security research & malware lab" meta={`0 / ${reverseLessons} lessons`} progress={0} tone="amber" href="/learn/security-research" />
          <Lane index="05" icon={Gamepad2} title="Game security & cheat research" meta={`0 / ${gameLessons} lessons`} progress={0} tone="violet" href="/learn/game-security" />
        </section>

        <aside className="runtime-panel">
          <header className="section-bar"><span>Local runtime</span><span className="runtime-live"><i /> configured</span></header>
          <div className="runtime-body">
            <RuntimeRow icon={Container} label="Sandbox" value="Docker / isolated" state="ready" />
            <RuntimeRow icon={Braces} label="Toolchains" value="GCC 13 · Clang 18" state="ready" />
            <RuntimeRow icon={TerminalSquare} label="Target" value="Linux x86_64" state="ready" />
            <div className="runtime-policy"><span>POLICY</span><code>net=none · cpu=.5 · mem=256m · pids=64</code></div>
            <Link className="runtime-link" href="/playground">Abrir playground <ArrowRight size={12} /></Link>
          </div>
        </aside>
      </div>

      <section className="home-stats" aria-label="Resumo de progresso">
        <div><span>Lições concluídas</span><strong>{learningStats.completedLessons}<small>/ {curriculumTotals.lessons}</small></strong></div>
        <div><span>Exercícios verificados</span><strong>{learningStats.completedExercises}</strong></div>
        <div><span>Tempo em prática</span><strong>18h<small>46m</small></strong></div>
        <div><span>Revisão pendente</span><strong>{reviewCards.length}<small>tópicos</small></strong></div>
      </section>
    </div>
  );
}

function Lane({ index, icon: Icon, title, meta, progress, tone, href }: { index: string; icon: typeof Braces; title: string; meta: string; progress: number; tone: string; href: string }) {
  return (
    <Link className="lane-row" href={href} data-tone={tone}>
      <span className="lane-index">{index}</span><Icon size={16} strokeWidth={1.5} />
      <div className="lane-copy"><strong>{title}</strong><span>{meta}</span></div>
      <div className="lane-progress"><i><b style={{ width: `${progress}%` }} /></i><span>{progress}%</span></div>
      <ChevronRight size={13} />
    </Link>
  );
}

function RuntimeRow({ icon: Icon, label, value, state }: { icon: typeof Container; label: string; value: string; state: string }) {
  return <div className="runtime-row"><Icon size={14} /><span>{label}</span><strong>{value}</strong><i data-state={state} /></div>;
}
