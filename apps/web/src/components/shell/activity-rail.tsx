"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation, secondaryNavigation } from "./navigation";

function isActive(pathname: string, href: string): boolean {
  const baseHref = href.split("#")[0] ?? href;
  if (baseHref === "/learn") {
    return pathname.startsWith("/learn");
  }
  return pathname.startsWith(baseHref);
}

export function ActivityRail() {
  const pathname = usePathname();

  return (
    <nav className="activity-rail" aria-label="Ferramentas principais">
      <div className="activity-primary">
        {primaryNavigation.map(({ label, href, icon: Icon, shortcut }) => (
          <Link
            className="activity-link"
            data-active={isActive(pathname, href)}
            href={href}
            key={label}
            title={`${label} (${shortcut})`}
            aria-label={label}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.6} />
            <span className="activity-shortcut">{shortcut}</span>
          </Link>
        ))}
      </div>
      <div className="activity-secondary">
        {secondaryNavigation.slice(0, 3).map(({ label, href, icon: Icon }) => (
          <Link className="activity-link" href={href} key={label} title={label} aria-label={label}>
            <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
          </Link>
        ))}
      </div>
    </nav>
  );
}

