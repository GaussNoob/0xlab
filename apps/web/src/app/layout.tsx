import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "0xLAB — Systems Learning Environment",
    template: "%s · 0xLAB"
  },
  description: "Laboratório interativo de C, C++, Assembly, Windows/Linux, memória, redes, gráficos e sistemas.",
  applicationName: "0xLAB",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#080a0d"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
