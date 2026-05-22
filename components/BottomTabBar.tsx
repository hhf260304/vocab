"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";

export default function BottomTabBar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;
  if (
    pathname.startsWith("/review/") ||
    /^\/sentences\/[^/]+\/review/.test(pathname)
  ) return null;

  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-sm border-t border-border z-10">
      <div className="flex h-14">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            !isSettings ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          語言
        </Link>
        <Link
          href="/settings"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            isSettings ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Settings className="w-5 h-5" />
          設定
        </Link>
      </div>
    </nav>
  );
}
