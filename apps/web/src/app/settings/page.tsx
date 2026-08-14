import { Container, Database, ShieldCheck, TerminalSquare, Type } from "lucide-react";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="catalog-header compact-header"><div><span className="eyebrow">Local configuration</span><h1>Ambiente.</h1><p>Configurações explícitas para execução, persistência e comportamento do laboratório.</p></div></header>
      <section className="settings-list">
        <SettingRow icon={Type} title="Escala tipográfica" value="Aa · 100% / +2 / +4" detail="Use o controle Aa na barra superior. A preferência vale para todas as páginas e fica salva neste navegador." />
        <SettingRow icon={Container} title="Sandbox runner" value="http://runner:8787" detail="A URL e o token são lidos apenas no servidor Next.js." />
        <SettingRow icon={TerminalSquare} title="Toolchain padrão" value="GCC · C17 · Linux x86_64" detail="Pode ser alterada por workspace no Playground." />
        <SettingRow icon={Database} title="Persistência" value="SQLite · WAL" detail="Conteúdo pessoal e progresso permanecem no volume local." />
        <SettingRow icon={ShieldCheck} title="Política de laboratório" value="authorized / local only" detail="Exemplos de segurança são limitados a binários próprios e ambientes controlados." />
      </section>
    </div>
  );
}

function SettingRow({ icon: Icon, title, value, detail }: { icon: typeof Container; title: string; value: string; detail: string }) {
  return <div className="setting-row"><Icon size={17} /><div><strong>{title}</strong><p>{detail}</p></div><code>{value}</code></div>;
}
