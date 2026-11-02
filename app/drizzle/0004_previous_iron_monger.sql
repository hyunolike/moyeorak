CREATE TABLE "participant_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(21) NOT NULL,
	"participant_id" integer NOT NULL,
	"device_key" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_devices" ADD CONSTRAINT "participant_devices_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_devices" ADD CONSTRAINT "participant_devices_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_devices_meeting_device_uq" ON "participant_devices" USING btree ("meeting_id","device_key");