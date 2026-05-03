import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/lab", label: "Research Lab" },
  { href: "/monitor", label: "Monitor" },
  { href: "/experiments", label: "Experiments" },
];

export function AppShell({ children }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Hosted Crypto Strategy Lab</span>
          <span className="brand-name">RegimeGuard AI</span>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="footer">
        Regime-aware backtesting, watchdog orchestration, and incident intelligence for BTC and ETH strategies.
      </footer>
    </div>
  );
}

