ALTER TABLE "sentences" ALTER COLUMN "next_review_at" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "sentences" ALTER COLUMN "next_review_at" SET DEFAULT CURRENT_DATE;--> statement-breakpoint
ALTER TABLE "vocabulary" ALTER COLUMN "next_review_at" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "vocabulary" ALTER COLUMN "next_review_at" SET DEFAULT CURRENT_DATE;