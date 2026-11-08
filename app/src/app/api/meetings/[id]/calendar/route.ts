import { buildIcs, calendarEvent } from "@/lib/calendar";
import { toResponse } from "@/server/http";
import { getMeetingSummary } from "@/server/meeting/summary-service";

/** 확정된 약속을 iCalendar(.ics) 파일로 내려준다. 시작 시각이 없으면 404. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let ics: string | null;
  try {
    const summary = await getMeetingSummary(id);
    const link = `${new URL(req.url).origin}/meetings/${id}`;
    const event = calendarEvent(summary, link);
    ics = event ? buildIcs(event, { uid: `${id}@moyeorak` }) : null;
  } catch (e) {
    // 오류 응답 모양은 다른 API와 같게 맞춘다.
    return toResponse(() => Promise.reject(e));
  }
  if (!ics) {
    return Response.json(
      {
        error: {
          code: "NO_START_TIME",
          message: "확정된 시간이 없어 캘린더에 넣을 수 없어요",
        },
      },
      { status: 404 },
    );
  }
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="moyeorak-${id}.ics"`,
      "cache-control": "no-store",
    },
  });
}
