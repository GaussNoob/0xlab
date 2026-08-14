"use client";

import { Braces, Container, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type RunnerState = "checking" | "online" | "offline";

export function Statusbar() {
  const [runnerState, setRunnerState] = useState<RunnerState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { runner: string }) => setRunnerState(data.runner === "online" ? "online" : "offline"))
      .catch(() => setRunnerState("offline"));
    return () => controller.abort();
  }, []);

  return (
    <footer className="statusbar">
      <div className="statusbar-group">
        <span className="status-item"><GitBranch size={10} /> local/main</span>
        <span className="status-item"><ShieldCheck size={10} /> authorized labs</span>
      </div>
      <div className="statusbar-group">
        <span className="status-item"><Braces size={10} /> C17 / C++23</span>
        <span className="status-item"><Container size={10} /> sandbox</span>
        <span className="status-item">
          <span className="status-dot" data-state={runnerState === "online" ? "online" : "offline"} />
          runner: {runnerState}
        </span>
      </div>
    </footer>
  );
}

