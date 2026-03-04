// app/vocabulary/[id]/page.tsx
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vocabulary } from "@/lib/db/schema";
import { getCategories } from "@/lib/actions/categories";
import EditVocabClient from "./EditVocabClient";

export default async function EditVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();
  const userId = session.user.id;

  const [vocab, categories] = await Promise.all([
    db
      .select()
      .from(vocabulary)
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .then((rows) => rows[0]),
    getCategories(),
  ]);

  if (!vocab) notFound();

  return <EditVocabClient vocab={vocab} categories={categories} />;
}
