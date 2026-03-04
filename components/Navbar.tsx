"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
	{ href: "/", label: "首頁" },
	{ href: "/vocabulary", label: "單字庫" },
];

export default function Navbar() {
	const pathname = usePathname();

	return (
		<nav className="border-b border-border bg-card sticky top-0 z-10">
			<div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
				<Link
					href="/"
					className="font-bold text-foreground text-lg tracking-wide"
				>
					🎌 日語單字
				</Link>
				<div className="flex gap-1">
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
				</div>
			</div>
		</nav>
	);
}
