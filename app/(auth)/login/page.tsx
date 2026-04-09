// app/(auth)/login/page.tsx
import { BookOpen } from "lucide-react";
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
			</div>
		</div>
	);
}
