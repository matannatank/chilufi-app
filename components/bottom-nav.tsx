"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "בית" },
  { href: "/history", label: "היסטוריה" },
  { href: "/profile", label: "פרופיל" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mt-auto grid grid-cols-3 gap-2 rounded-xl border border-zinc-300 bg-zinc-50 p-2 shadow-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-200/70"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
