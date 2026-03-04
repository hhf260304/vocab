// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // account is only present on first sign-in
      if (account) {
        await db
          .insert(users)
          .values({
            id: token.sub!,
            email: token.email!,
            name: token.name,
            image: token.picture,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { name: token.name, image: token.picture },
          });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});
