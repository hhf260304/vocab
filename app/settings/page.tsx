// app/settings/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordSection from "./ChangePasswordSection";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">設定</h1>
        <p className="text-muted-foreground text-sm mt-1">管理你的帳號</p>
      </div>

      <ChangePasswordSection />
    </div>
  );
}
