CREATE TABLE IF NOT EXISTS "scheduled_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"media_type" varchar(32),
	"caption" text NOT NULL,
	"location_id" text,
	"user_tags_json" text,
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"retry_attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"last_error_message" text,
	"media_container_id" text,
	"media_container_status" varchar(32),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "scheduled_posts_media_container_id_unique" UNIQUE("media_container_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
