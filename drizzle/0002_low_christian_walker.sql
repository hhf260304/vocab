ALTER TABLE "categories" ADD COLUMN "language_id" text;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "zhuyin" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "languages" DROP COLUMN "default_side";