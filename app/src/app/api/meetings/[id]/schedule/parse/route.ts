import { z } from "zod";
import { parseAvailability } from "@/server/ai/time-parse/parse-availability";
import { readJson, toResponse } from "@/server/http";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { getMeeting } from "@/server/meeting/meeting-service";
import { requireParticipant } from "@/server/meeting/require-participant";
import {
  AlreadyConfirmedError,
  ScheduleNotFoundError,
} from "@/server/schedule/errors";

const NO_SLOTS_SUMMARY =
  "말씀하신 시간이 이번 투표 날짜 안에 없어요. 시간표에서 직접 골라 주세요.";

const body = z.object({ text: z.string().trim().min(1).max(200) });

/**
 * 가능 시간 문장을 투표판 칸으로 바꿔 돌려준다. 저장하지 않는다.
 * 저장은 사용자가 확인한 뒤 PUT /schedule/votes로 한다.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    await requireParticipant(req, id);
    const { text } = body.parse(await readJson(req));

    const meeting = await getMeeting(id);
    if (!meeting) throw new MeetingNotFoundError();
    const poll = meeting.schedulePoll;
    if (!poll) throw new ScheduleNotFoundError();
    // 투표가 끝난 모임에 AI 호출 횟수를 쓰지 않는다.
    if (meeting.status !== "scheduling") throw new AlreadyConfirmedError();

    const { slots, dropped, summary } = await parseAvailability({
      meetingId: id,
      text,
      poll,
    });
    return {
      slots: slots.map((s) => s.toISOString()),
      dropped,
      summary: slots.length === 0 ? NO_SLOTS_SUMMARY : summary,
    };
  });
}
