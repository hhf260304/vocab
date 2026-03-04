// app/review/page.tsx
import { getTodayReviews } from "@/lib/actions/vocabulary";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  const queue = await getTodayReviews();
  return <ReviewClient queue={queue} />;
}
