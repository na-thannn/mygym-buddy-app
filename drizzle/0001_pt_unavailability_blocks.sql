CREATE TABLE "pt_unavailability_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"pt_id" text NOT NULL,
	"unavailable_date" text NOT NULL,
	"all_day" integer DEFAULT 1 NOT NULL,
	"start_time" text,
	"end_time" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "pt_unavailability_blocks" (
	"id",
	"pt_id",
	"unavailable_date",
	"all_day",
	"start_time",
	"end_time",
	"reason",
	"created_at"
)
SELECT
	"id",
	"pt_id",
	"unavailable_date",
	1,
	NULL,
	NULL,
	"reason",
	"created_at"
FROM "pt_unavailable_days";
--> statement-breakpoint
ALTER TABLE "pt_unavailability_blocks" ADD CONSTRAINT "pt_unavailability_blocks_pt_id_users_id_fk" FOREIGN KEY ("pt_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP TABLE "pt_unavailable_days";
