"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutSection() {
  return (
    <div className="pt-4 border-t border-border">
      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ redirectTo: "/login" })}
      >
        <LogOut className="w-4 h-4 mr-2" />
        登出
      </Button>
    </div>
  );
}
