import {
  Activity,
  Binary,
  BookOpen,
  Braces,
  Bug,
  Boxes,
  Cpu,
  FlaskConical,
  FolderKanban,
  Gamepad2,
  Gauge,
  MonitorCog,
  RotateCcw,
  Settings,
  ShieldAlert
} from "lucide-react";

export const primaryNavigation = [
  { label: "Learn", href: "/learn", icon: BookOpen, shortcut: "1" },
  { label: "Assembly", href: "/learn/assembly", icon: Binary, shortcut: "2" },
  { label: "Windows", href: "/learn/windows", icon: MonitorCog, shortcut: "3" },
  { label: "Graphics", href: "/learn/graphics", icon: Boxes, shortcut: "4" },
  { label: "Security", href: "/labs/security", icon: ShieldAlert, shortcut: "5" },
  { label: "Labs", href: "/labs", icon: FlaskConical, shortcut: "6" },
  { label: "Low-Level Lab", href: "/labs/low-level", icon: Cpu, shortcut: "7" },
  { label: "Playground", href: "/playground", icon: Braces, shortcut: "8" },
  { label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "9" },
  { label: "Progress", href: "/progress", icon: Gauge, shortcut: "0" },
  { label: "Review", href: "/review", icon: RotateCcw, shortcut: "R" }
] as const;

export const secondaryNavigation = [
  { label: "Diagnostics", href: "/playground#diagnostics", icon: Bug },
  { label: "Runtime status", href: "/playground#runtime", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings }
] as const;

export const commandItems = [
  ...primaryNavigation.map((item) => ({ ...item, group: "Navegação" })),
  { label: "Abrir Low-Level Lab", href: "/labs/low-level", icon: Cpu, group: "Laboratórios" },
  { label: "Continuar: endereço e indireção", href: "/learn/c/c-pointers/pointers", icon: BookOpen, group: "Continuar" },
  { label: "Abrir Assembly Visualizer", href: "/labs/assembly", icon: Binary, group: "Laboratórios" },
  { label: "Abrir Security Lab", href: "/labs/security", icon: ShieldAlert, group: "Laboratórios" },
  { label: "Abrir trilha Security Research", href: "/learn/security-research", icon: ShieldAlert, group: "Continuar" },
  { label: "Abrir Game Security Lab", href: "/labs/game-security", icon: Gamepad2, group: "Laboratórios" },
  { label: "Abrir trilha Game Security", href: "/learn/game-security", icon: Gamepad2, group: "Continuar" },
  { label: "Comparar C++ e Assembly", href: "/labs/compiler", icon: Braces, group: "Laboratórios" },
  { label: "Nova execução C", href: "/playground?language=c", icon: Braces, group: "Ações" },
  { label: "Nova execução C++", href: "/playground?language=cpp", icon: Braces, group: "Ações" }
] as const;
