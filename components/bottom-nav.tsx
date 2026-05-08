"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "בית", icon: "🏠" },
  { href: "/my-requests", label: "הבקשות שלי", icon: "📋" },
  { href: "/team", label: "צוות", icon: "👥" },
  { href: "/history", label: "היסטוריה", icon: "🕒" },
  { href: "/profile", label: "פרופיל", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mt-auto grid grid-cols-5 gap-1 rounded-xl border border-zinc-300 bg-zinc-50 p-1.5 shadow-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[10px] font-medium leading-tight transition sm:text-xs ${
              isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-200/70"
            }`}
          >
            <span className="text-xs sm:text-sm">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
