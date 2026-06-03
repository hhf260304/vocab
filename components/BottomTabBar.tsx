"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import type { Language } from "@/lib/db/schema";

interface Props {
  languages: Language[];
}

const TTS_FLAGS: Record<string, string> = {
  "zh-TW": "🇹🇼",
  "zh-HK": "🇭🇰",
  "en-US": "🇺🇸",
  "en-GB": "🇬🇧",
  "ja-JP": "🇯🇵",
  "ko-KR": "🇰🇷",
  "fr-FR": "🇫🇷",
  "de-DE": "🇩🇪",
  "es-ES": "🇪🇸",
};

export default function BottomTabBar({ languages }: Props) {
  const pathname = usePathname();

  if (pathname === "/login") return null;
  if (
    pathname.startsWith("/review/") ||
    /^\/sentences\/[^/]+\/review/.test(pathname)
  ) return null;

  return (
    <nav className="bg-card/90 backdrop-blur-sm border-t border-border z-10">
      <div className="flex h-14">
        {languages.length === 0 ? (
          <Link
            href="/"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs text-primary"
          >
            <Globe className="w-5 h-5" />
            語言
          </Link>
        ) : (
          languages.map((lang) => {
            const isActive =
              pathname.startsWith(`/languages/${lang.id}`) ||
              pathname.startsWith(`/review/${lang.id}`);
            const flag = TTS_FLAGS[lang.ttsCode];
            return (
              <Link
                key={lang.id}
                href={`/languages/${lang.id}`}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {flag ? (
                  <span className="text-lg leading-none">{flag}</span>
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                {lang.name}
              </Link>
            );
          })
        )}
      </div>
    </nav>
  );
}
