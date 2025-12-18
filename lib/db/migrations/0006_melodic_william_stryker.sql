CREATE TABLE IF NOT EXISTS "meta_ad_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"meta_business_account_id" text NOT NULL,
	"ad_account_id" text NOT NULL,
	"account_id" text NOT NULL,
	"name" text,
	"currency" text,
	"timezone_id" text,
	"timezone_name" text,
	"account_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "meta_ad_accounts_meta_business_account_id_ad_account_id_unique" UNIQUE("meta_business_account_id","ad_account_id")
);
--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP CONSTRAINT "meta_business_accounts_user_id_account_id_unique";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" ADD COLUMN "facebook_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_business_accounts" ADD COLUMN "picture_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_meta_business_account_id_meta_business_accounts_id_fk" FOREIGN KEY ("meta_business_account_id") REFERENCES "public"."meta_business_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "account_id";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "username";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "website";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "biography";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "profile_picture_url";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" DROP COLUMN IF EXISTS "media_count";--> statement-breakpoint
ALTER TABLE "meta_business_accounts" ADD CONSTRAINT "meta_business_accounts_user_id_facebook_user_id_unique" UNIQUE("user_id","facebook_user_id");