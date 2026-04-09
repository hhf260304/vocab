// app/(auth)/login/page.tsx
import { signIn } from "@/auth";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";

export default function LoginPage() {
	return (
		<div className="flex-1 bg-background flex items-center justify-center px-4">
			<div className="bg-card border border-border rounded-3xl p-10 flex flex-col items-center gap-6 w-full max-w-sm shadow-[0_2px_0_0_rgba(79,70,229,0.1),0_8px_32px_-4px_rgba(79,70,229,0.08)]">
				{/* Header */}
				<div className="flex flex-col items-center gap-1 text-center">
					<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
						<BookOpen className="w-7 h-7 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-foreground mt-2">
						快快樂樂背單字
					</h1>
					<p className="text-muted-foreground text-sm">單字練習本</p>
				</div>

				{/* Credentials form */}
				<LoginForm />

				{/* Divider */}
				<div className="w-full flex items-center gap-3">
					<div className="flex-1 h-px bg-border" />
					<span className="text-xs text-muted-foreground">或</span>
					<div className="flex-1 h-px bg-border" />
				</div>

				{/* Google login */}
				<form
					action={async () => {
						"use server";
						await signIn("google", { redirectTo: "/" });
					}}
					className="w-full"
				>
					<Button type="submit" variant="outline" className="w-full gap-3">
						<svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						使用 Google 帳號登入
					</Button>
				</form>
			</div>
		</div>
	);
}
