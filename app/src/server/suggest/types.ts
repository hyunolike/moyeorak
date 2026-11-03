import { z } from "zod";

const source = z.enum(["ai", "rule"]);

export const SchedulePayload = z.object({
  kind: z.literal("schedule"),
  axis: z.enum(["most", "soonest"]),
  start: z.string(),
  end: z.string(),
  available: z.array(z.string()),
  unavailable: z.array(z.string()),
  reason: z.string(),
  source,
});

export const LocationPayload = z.object({
  kind: z.literal("location"),
  axis: z.enum(["venues", "average", "fairness"]),
  stationId: z.number().int(),
  name: z.string(),
  line: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  departAt: z.string(),
  averageMinutes: z.number(),
  maxMinutes: z.number().nullable(),
  perParticipant: z.array(
    z.object({ name: z.string(), minutes: z.number().nullable() }),
  ),
  // 옛 저장 제안에는 없다.
  venue: z.object({ label: z.string(), count: z.number() }).nullish(),
  reason: z.string(),
  source,
});

export const SuggestionPayload = z.discriminatedUnion("kind", [
  SchedulePayload,
  LocationPayload,
]);

export type SchedulePayload = z.infer<typeof SchedulePayload>;
export type LocationPayload = z.infer<typeof LocationPayload>;
export type SuggestionPayload = z.infer<typeof SuggestionPayload>;
export type SuggestionKind = SuggestionPayload["kind"];

export type Suggestion = {
  id: number;
  status: "proposed" | "accepted" | "rejected";
  createdAt: string;
} & SuggestionPayload;
