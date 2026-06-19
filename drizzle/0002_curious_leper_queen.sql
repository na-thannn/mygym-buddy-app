CREATE TABLE "daily_motivation" (
	"user_id" text NOT NULL,
	"for_date" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_motivation_user_id_for_date_pk" PRIMARY KEY("user_id","for_date")
);
--> statement-breakpoint
CREATE TABLE "feed_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"is_agent" integer DEFAULT 0 NOT NULL,
	"macros_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"image_base64" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_public" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pt_unavailability_blocks" ALTER COLUMN "all_day" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "guest_meetings" ADD COLUMN "meeting_type" text DEFAULT 'in_person' NOT NULL;--> statement-breakpoint
ALTER TABLE "guest_meetings" ADD COLUMN "online_meeting_url" text;--> statement-breakpoint
ALTER TABLE "guest_meetings" ADD COLUMN "zalo_user_id" text;--> statement-breakpoint
ALTER TABLE "guest_meetings" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pt_profiles" ADD COLUMN "photo_base64" text;--> statement-breakpoint
ALTER TABLE "daily_motivation" ADD CONSTRAINT "daily_motivation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_community_feed_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_feed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;