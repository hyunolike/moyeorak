import {
  boolean,
  date,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const meetings = pgTable("meetings", {
  id: varchar("id", { length: 21 }).primaryKey(),
  hostName: varchar("host_name", { length: 50 }).notNull(),
  participantCount: integer("participant_count").notNull(),
  scope: text("scope").$type<"schedule" | "location" | "both">().notNull(),
  status: text("status")
    .$type<"scheduling" | "locating" | "confirmed">()
    .notNull(),
  confirmedAt: timestamptz("confirmed_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    meetingId: varchar("meeting_id", { length: 21 })
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    deviceKey: varchar("device_key", { length: 64 }).notNull(),
    isHost: boolean("is_host").notNull().default(false),
  },
  (t) => [
    uniqueIndex("participants_meeting_device_uq").on(t.meetingId, t.deviceKey),
  ],
);

export const schedulePolls = pgTable(
  "schedule_polls",
  {
    id: serial("id").primaryKey(),
    meetingId: varchar("meeting_id", { length: 21 })
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    dateOptions: date("date_options", { mode: "string" }).array().notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    confirmedStart: timestamptz("confirmed_start"),
    confirmedEnd: timestamptz("confirmed_end"),
    /** 일정을 확정한 시각. scope와 상관없이 confirmSchedule이 남긴다. */
    confirmedAt: timestamptz("confirmed_at"),
  },
  (t) => [uniqueIndex("schedule_polls_meeting_uq").on(t.meetingId)],
);

export const scheduleVotes = pgTable(
  "schedule_votes",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    slots: timestamp("slots", { withTimezone: true, mode: "date" })
      .array()
      .notNull(),
  },
  (t) => [uniqueIndex("schedule_votes_participant_uq").on(t.participantId)],
);

export const locationVotes = pgTable(
  "location_votes",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => [uniqueIndex("location_votes_participant_uq").on(t.participantId)],
);

export const confirmedLocations = pgTable(
  "confirmed_locations",
  {
    id: serial("id").primaryKey(),
    meetingId: varchar("meeting_id", { length: 21 })
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    stationId: integer("station_id"),
    name: varchar("name", { length: 100 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => [uniqueIndex("confirmed_locations_meeting_uq").on(t.meetingId)],
);

export const stations = pgTable(
  "stations",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    line: varchar("line", { length: 50 }),
    name: varchar("name", { length: 100 }).notNull(),
    geom: geometry("geom", { type: "point", srid: 4326 }).notNull(),
  },
  (t) => [index("idx_stations_geom").using("gist", t.geom)],
);

export const agentSuggestions = pgTable("agent_suggestions", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 21 })
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status")
    .$type<"proposed" | "accepted" | "rejected">()
    .notNull()
    .default("proposed"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  resolvedAt: timestamptz("resolved_at"),
});

export const agentCallLogs = pgTable("agent_call_logs", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 21 }).references(
    () => meetings.id,
    { onDelete: "cascade" },
  ),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  ok: boolean("ok").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const meetingEvents = pgTable("meeting_events", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 21 })
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  type: text("type")
    .$type<
      | "created"
      | "joined"
      | "vote_done"
      | "departure_done"
      | "shared"
      | "suggestion_viewed"
      | "confirmed"
    >()
    .notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

/** 외부 API(Google Routes, Kakao) 응답 캐시. 키 접두어로 일일 호출 수도 센다. */
export const externalCache = pgTable("external_cache", {
  key: varchar("key", { length: 200 }).primaryKey(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});
