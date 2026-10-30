CREATE TABLE "external_cache" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_polls" ADD COLUMN "confirmed_at" timestamp with time zone;