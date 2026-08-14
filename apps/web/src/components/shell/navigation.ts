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
  Gauge,
  MonitorCog,
  RotateCcw,
  Settings
} from "lucide-react";

export const primaryNavigation = [
  { label: "Learn", href: "/learn", icon: BookOpen, shortcut: "1" },
  { label: "Assembly", href: "/learn/assembly", icon: Binary, shortcut: "2" },
  { label: "Windows", href: "/learn/windows", icon: MonitorCog, shortcut: "3" },
  { label: "Graphics", href: "/learn/graphics", icon: Boxes, shortcut: "4" },
  { label: "Labs", href: "/labs", icon: FlaskConical, shortcut: "5" },
  { label: "Low-Level Lab", href: "/labs/low-level", icon: Cpu, shortcut: "6" },
  { label: "Playground", href: "/playground", icon: Braces, shortcut: "7" },
  { label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "8" },
  { label: "Progress", href: "/progress", icon: Gauge, shortcut: "9" },
  { label: "Review", href: "/review", icon: RotateCcw, shortcut: "0" }
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
  { label: "Abrir Graphics Playground", href: "/labs/graphics", icon: Boxes, group: "Laboratórios" },
  { label: "Comparar C++ e Assembly", href: "/labs/compiler", icon: Braces, group: "Laboratórios" },
  { label: "Nova execução C", href: "/playground?language=c", icon: Braces, group: "Ações" },
  { label: "Nova execução C++", href: "/playground?language=cpp", icon: Braces, group: "Ações" }
] as const;
