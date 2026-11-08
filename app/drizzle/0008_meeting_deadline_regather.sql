ALTER TABLE "meetings" ADD COLUMN "respond_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "source_meeting_id" varchar(21);