"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/devis", label: "Mes Devis", icon: "\uD83D\uDCC4" },
  { href: "/opportunites", label: "Opportunités", icon: "\uD83C\uDFAF" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-navy flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 pt-8 pb-10">
        <h1 className="text-white text-lg font-bold tracking-wide">
          Radar Sylvain
        </h1>
        <p className="text-white/40 text-xs mt-0.5">Espace de gestion</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-6 py-6 border-t border-white/10">
        <p className="text-white text-sm font-semibold">Sylvain Gérard</p>
        <p className="text-white/40 text-xs">Artiste de spectacle</p>
      </div>
    </aside>
  );
}
