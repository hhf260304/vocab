// components/Navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "首頁" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-foreground text-lg tracking-wide min-w-0 truncate flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          快快樂樂背單字
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
          {session?.user && (
            <div className="flex items-center gap-2 ml-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "用戶"}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => signOut({ redirectTo: "/login" })}
              >
                登出
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
