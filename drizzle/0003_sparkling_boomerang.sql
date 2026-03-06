ALTER TABLE "vocabulary" DROP CONSTRAINT "vocabulary_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;