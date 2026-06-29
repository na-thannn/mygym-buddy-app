CREATE TABLE "feed_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_post_id_community_feed_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_feed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_likes_post_user_idx" ON "feed_likes" USING btree ("post_id","user_id");--> statement-breakpoint
ALTER TABLE "inbody_reports" ADD COLUMN "image_base64" text;--> statement-breakpoint
ALTER TABLE "inbody_reports" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;
