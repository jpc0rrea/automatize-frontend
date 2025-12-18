DROP TABLE IF EXISTS "meta-business-accounts" CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meta_business_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"username" text,
	"name" text,
	"website" text,
	"biography" text,
	"profile_picture_url" text,
	"media_count" integer,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "meta_business_accounts_user_id_account_id_unique" UNIQUE("user_id","account_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meta_business_accounts" ADD CONSTRAINT "meta_business_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
