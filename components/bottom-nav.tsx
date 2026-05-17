"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  isShiftCommander?: boolean;
  pendingApprovalsCount?: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "בית", icon: "🏠" },
  { href: "/my-requests", label: "הבקשות שלי", icon: "📋" },
  { href: "/team", label: "צוות", icon: "👥" },
  { href: "/history", label: "היסטוריה", icon: "🕒" },
  { href: "/profile", label: "פרופיל", icon: "👤" },
];

export function BottomNav({
  isShiftCommander = false,
  pendingApprovalsCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = isShiftCommander
    ? [
        BASE_NAV_ITEMS[0],
        {
          href: "/approvals",
          label: "אישורים",
          icon: "✅",
          badge: pendingApprovalsCount,
        },
        ...BASE_NAV_ITEMS.slice(1),
      ]
    : BASE_NAV_ITEMS;

  const gridCols =
    navItems.length === 6 ? "grid-cols-6" : "grid-cols-5";

  return (
    <nav
      className={`sticky bottom-0 mt-auto grid ${gridCols} gap-1 rounded-xl border border-zinc-300 bg-zinc-50 p-1.5 shadow-sm`}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const badge = item.badge ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[10px] font-medium leading-tight transition sm:text-xs ${
              isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-200/70"
            }`}
          >
            <span className="text-xs sm:text-sm">{item.icon}</span>
            <span className="truncate">{item.label}</span>
            {typeof badge === "number" && badge > 0 ? (
              <span className="absolute -top-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
