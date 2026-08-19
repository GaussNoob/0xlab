"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActivityRail } from "./activity-rail";
import { CommandPalette } from "./command-palette";
import { CourseSidebar } from "./course-sidebar";
import { Statusbar } from "./statusbar";
import { Topbar } from "./topbar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const focusWorkspace = pathname === "/labs/low-level"
    || pathname.startsWith("/labs/security")
    || pathname.startsWith("/labs/game-security");
  const [commandOpen, setCommandOpen] = useState(false);
  const [textScale, setTextScale] = useState<"comfortable" | "large" | "extra-large">("comfortable");
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  const cycleTextScale = useCallback(() => {
    setTextScale((current) => {
      const next = current === "comfortable" ? "large" : current === "large" ? "extra-large" : "comfortable";
      window.localStorage.setItem("0xlab.text-scale", next);
      return next;
    });
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("0xlab.text-scale");
    if (saved === "large" || saved === "extra-large" || saved === "comfortable") setTextScale(saved);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell" data-focus-workspace={focusWorkspace} data-text-scale={textScale}>
      <Topbar onOpenCommand={() => setCommandOpen(true)} onCycleTextScale={cycleTextScale} textScale={textScale} />
      <ActivityRail />
      <CourseSidebar />
      <main className="workspace-main">{children}</main>
      <Statusbar />
      <CommandPalette open={commandOpen} onClose={closeCommand} />
    </div>
  );
}
