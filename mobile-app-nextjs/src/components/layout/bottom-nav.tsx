"use client";

import { cn } from "@/lib/utils";
import { Droplets, LayoutGrid, Route, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: LayoutGrid,
  },
  {
    href: "/diesel",
    label: "Diesel",
    icon: Droplets,
  },
  {
    href: "/trip",
    label: "Trips",
    icon: Route,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 safe-area-bottom">
      <div className="relative mx-auto max-w-md">
        {/* Glow effect behind nav */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-violet-500/20 via-blue-500/10 to-violet-500/20 blur-xl" />

        {/* Main nav container */}
        <div className="relative flex items-center justify-around h-[72px] px-2 rounded-[28px] bg-black/30 backdrop-blur-2xl border border-white/14 shadow-2xl shadow-black/20">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all duration-300 no-select",
                  isActive
                    ? "text-white"
                    : "text-white/50 hover:text-white/70 active:scale-95"
                )}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-gradient-to-b from-violet-500/30 to-transparent" />
                )}

                {/* Icon container */}
                <div className={cn(
                  "relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300",
                  isActive && "bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/40"
                )}>
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </div>

                {/* Label */}
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-60"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}