// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // account is only present on first sign-in (Google)
      if (account?.provider === "google") {
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
