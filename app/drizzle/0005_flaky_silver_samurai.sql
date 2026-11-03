CREATE TABLE "station_venues" (
	"station_name" varchar(100) PRIMARY KEY NOT NULL,
	"meal" integer DEFAULT 0 NOT NULL,
	"drink" integer DEFAULT 0 NOT NULL,
	"cafe" integer DEFAULT 0 NOT NULL,
	"study" integer DEFAULT 0 NOT NULL,
	"sight" integer DEFAULT 0 NOT NULL,
	"radius_meters" integer NOT NULL,
	"counted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "purposes" text[] DEFAULT '{}'::text[] NOT NULL;