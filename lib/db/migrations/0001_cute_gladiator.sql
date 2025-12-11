CREATE TABLE IF NOT EXISTS "instagram_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"username" text,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "instagram_accounts_user_id_account_id_unique" UNIQUE("user_id","account_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
