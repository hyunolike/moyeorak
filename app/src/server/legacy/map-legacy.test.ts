import { describe, expect, it } from "vitest";
import {
  type LegacyMeetingBundle,
  legacyDeviceKey,
  legacyLocalToInstant,
  mapLegacyConfirmedLocation,
  mapLegacyLocationVote,
  mapLegacyMeeting,
  mapLegacySchedulePoll,
  mapLegacySlots,
  resolveLegacyConfirmation,
} from "@/server/legacy/map-legacy";

const UUID = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";

function bundle(over: Partial<LegacyMeetingBundle> = {}): LegacyMeetingBundle {
  return {
    meeting: {
      meeting_id: "abcdefghijklmnopqrstu",
      participant_count: 4,
      created_at: "2026-03-01 18:30:00",
      initial_flow: "SCHEDULE",
    },
    participants: [
      {
        participant_id: "1",
        name: "민지",
        is_host: false,
        local_storage_key: null,
      },
      {
        participant_id: "2",
        name: "지수",
        is_host: true,
        local_storage_key: UUID,
      },
    ],
    schedulePoll: { poll_status: "VOTING", updated_at: "2026-03-02 10:00:00" },
    locationPoll: {
      poll_status: "INACTIVE",
      updated_at: "2026-03-02 11:00:00",
    },
    scheduleVoteCount: 0,
    locationVoteCount: 0,
    ...over,
  };
}

describe("legacyLocalToInstant", () => {
  it("서울 벽시계 문자열을 UTC 순간으로 바꾼다", () => {
    expect(legacyLocalToInstant("2026-03-01T18:30").toISOString()).toBe(
      "2026-03-01T09:30:00.000Z",
    );
  });

  it("Postgres timestamp 글자(공백, 초, 마이크로초)도 읽는다", () => {
    expect(
      legacyLocalToInstant("2026-03-01 00:15:07.123456").toISOString(),
    ).toBe("2026-02-28T15:15:07.123Z");
  });

  it("Date는 UTC 필드에 서울 벽시계가 담긴 것으로 본다", () => {
    expect(
      legacyLocalToInstant(new Date("2026-03-01T18:30:00Z")).toISOString(),
    ).toBe("2026-03-01T09:30:00.000Z");
  });

  it("읽을 수 없는 값은 Invalid Date", () => {
    expect(Number.isNaN(legacyLocalToInstant("어제 저녁").getTime())).toBe(
      true,
    );
  });
});

describe("mapLegacyMeeting", () => {
  it("호스트 이름은 is_host 참여자, 생성 시각은 서울 벽시계로 옮긴다", () => {
    const m = mapLegacyMeeting(bundle());
    expect(m.id).toBe("abcdefghijklmnopqrstu");
    expect(m.hostName).toBe("지수");
    expect(m.createdAt?.toISOString()).toBe("2026-03-01T09:30:00.000Z");
  });

  it("호스트가 없으면 첫 참여자, 참여자도 없으면 모임장", () => {
    const b = bundle();
    const noHost = b.participants.map((p) => ({ ...p, is_host: false }));
    expect(mapLegacyMeeting(bundle({ participants: noHost })).hostName).toBe(
      "민지",
    );
    expect(mapLegacyMeeting(bundle({ participants: [] })).hostName).toBe(
      "모임장",
    );
  });

  it("participant_count와 실제 참여자 수 중 큰 쪽을 쓰고 2명 밑으로는 두지 않는다", () => {
    expect(mapLegacyMeeting(bundle()).participantCount).toBe(4);
    const zero = bundle();
    zero.meeting.participant_count = 0;
    expect(mapLegacyMeeting(zero).participantCount).toBe(2);
    const three = [
      ...bundle().participants,
      {
        participant_id: "3",
        name: "하늘",
        is_host: false,
        local_storage_key: null,
      },
    ];
    const nul = bundle({ participants: three });
    nul.meeting.participant_count = null;
    expect(mapLegacyMeeting(nul).participantCount).toBe(3);
    const under = bundle({ participants: three });
    under.meeting.participant_count = 2;
    expect(mapLegacyMeeting(under).participantCount).toBe(3);
    const one = bundle({ participants: [] });
    one.meeting.participant_count = 1;
    expect(mapLegacyMeeting(one).participantCount).toBe(2);
  });

  it("scope: initial_flow가 SCHEDULE이면 schedule, 장소 표가 있으면 both", () => {
    expect(mapLegacyMeeting(bundle()).scope).toBe("schedule");
    expect(mapLegacyMeeting(bundle({ locationVoteCount: 1 })).scope).toBe(
      "both",
    );
  });

  it("scope: initial_flow가 LOCATION이면 location, 일정 표가 있으면 both", () => {
    const loc = bundle();
    loc.meeting.initial_flow = "LOCATION";
    expect(mapLegacyMeeting(loc).scope).toBe("location");
    expect(mapLegacyMeeting({ ...loc, scheduleVoteCount: 2 }).scope).toBe(
      "both",
    );
  });

  it("status: scope schedule에서 일정 poll이 CONFIRMED면 confirmed, confirmedAt은 그 poll의 updated_at", () => {
    const m = mapLegacyMeeting(
      bundle({
        schedulePoll: {
          poll_status: "CONFIRMED",
          updated_at: "2026-03-02 10:00:00",
        },
      }),
    );
    expect(m.status).toBe("confirmed");
    expect(m.confirmedAt?.toISOString()).toBe("2026-03-02T01:00:00.000Z");
  });

  it("status: scope both에서 일정만 확정이면 locating, 장소도 확정이면 confirmed", () => {
    const confirmedSchedule = {
      poll_status: "CONFIRMED",
      updated_at: "2026-03-02 10:00:00",
    };
    const locating = mapLegacyMeeting(
      bundle({ schedulePoll: confirmedSchedule, locationVoteCount: 1 }),
    );
    expect(locating.status).toBe("locating");
    expect(locating.confirmedAt).toBeNull();

    const done = mapLegacyMeeting(
      bundle({
        schedulePoll: confirmedSchedule,
        locationPoll: {
          poll_status: "CONFIRMED",
          updated_at: "2026-03-03 12:00:00",
        },
        locationVoteCount: 1,
      }),
    );
    expect(done.status).toBe("confirmed");
    expect(done.confirmedAt?.toISOString()).toBe("2026-03-03T03:00:00.000Z");
  });

  it("status: scope location은 장소 poll이 CONFIRMED면 confirmed, 아니면 locating", () => {
    const loc = bundle();
    loc.meeting.initial_flow = "LOCATION";
    expect(mapLegacyMeeting(loc).status).toBe("locating");
    const m = mapLegacyMeeting({
      ...loc,
      locationPoll: {
        poll_status: "CONFIRMED",
        updated_at: "2026-03-03 12:00:00",
      },
    });
    expect(m.status).toBe("confirmed");
    expect(m.confirmedAt?.toISOString()).toBe("2026-03-03T03:00:00.000Z");
  });

  it("status: 확정 전이면 scheduling", () => {
    const m = mapLegacyMeeting(bundle({ locationVoteCount: 1 }));
    expect(m.status).toBe("scheduling");
    expect(m.confirmedAt).toBeNull();
  });
});

describe("legacyDeviceKey", () => {
  it("local_storage_key를 그대로 쓴다", () => {
    expect(
      legacyDeviceKey({
        participant_id: "2",
        name: "지수",
        is_host: true,
        local_storage_key: UUID,
      }),
    ).toBe(UUID);
  });

  it("키가 없으면 짐작할 수 없는 21자 id를 새로 만든다", () => {
    const row = {
      participant_id: "42",
      name: "민지",
      is_host: false,
      local_storage_key: null,
    };
    const key = legacyDeviceKey(row);
    expect(key).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(key).not.toContain("42");
    expect(legacyDeviceKey(row)).not.toBe(key);
  });

  it("키가 64자를 넘으면 새 21자 id로 바꾼다", () => {
    const key = legacyDeviceKey({
      participant_id: "7",
      name: "도윤",
      is_host: false,
      local_storage_key: "x".repeat(65),
    });
    expect(key).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });
});

describe("mapLegacySchedulePoll", () => {
  it("date_options JSON을 펼치고 시간 단위 값은 분으로 바꾼다", () => {
    const p = mapLegacySchedulePoll({
      poll_status: "CONFIRMED",
      date_options: '["2026-03-02","2026-03-01"]',
      start_time: 9,
      end_time: 24,
      confirmed_start_time: "2026-03-01 18:30:00",
      confirmed_end_time: "2026-03-01 20:00:00",
      updated_at: "2026-03-02 10:00:00",
    });
    expect(p.dateOptions).toEqual(["2026-03-01", "2026-03-02"]);
    expect(p.startMinute).toBe(540);
    expect(p.endMinute).toBe(1440);
    expect(p.confirmedStart?.toISOString()).toBe("2026-03-01T09:30:00.000Z");
    expect(p.confirmedEnd?.toISOString()).toBe("2026-03-01T11:00:00.000Z");
    expect(p.confirmedAt?.toISOString()).toBe("2026-03-02T01:00:00.000Z");
  });

  it("분 단위 값은 그대로, 확정 전이면 확정 시각이 없다", () => {
    const p = mapLegacySchedulePoll({
      poll_status: "VOTING",
      date_options: "[]",
      start_time: 600,
      end_time: 1320,
      confirmed_start_time: null,
      confirmed_end_time: null,
      updated_at: "2026-03-02 10:00:00",
    });
    expect(p.startMinute).toBe(600);
    expect(p.endMinute).toBe(1320);
    expect(p.dateOptions).toEqual([]);
    expect(p.confirmedStart).toBeNull();
    expect(p.confirmedAt).toBeNull();
  });
});

describe("mapLegacySlots", () => {
  const poll = {
    dateOptions: ["2026-03-01"],
    startMinute: 540,
    endMinute: 1440,
  };

  it("voted_date JSON의 서울 벽시계 칸을 순간으로 옮긴다", () => {
    const r = mapLegacySlots(
      '["2026-03-01T18:30:00","2026-03-01T18:00:00"]',
      poll,
    );
    expect(r.slots.map((d) => d.toISOString())).toEqual([
      "2026-03-01T09:00:00.000Z",
      "2026-03-01T09:30:00.000Z",
    ]);
    expect(r.dropped).toEqual({});
  });

  it("30분 단위가 아닌 칸과 판 밖의 칸은 버리고 이유별로 센다", () => {
    const r = mapLegacySlots(
      '["2026-03-01T18:15","2026-03-01T18:00","2026-03-05T18:00","2026-03-01T08:00"]',
      poll,
    );
    expect(r.slots.map((d) => d.toISOString())).toEqual([
      "2026-03-01T09:00:00.000Z",
    ]);
    expect(r.dropped).toEqual({
      "30분 단위가 아닌 칸": 1,
      "투표판 밖의 칸": 2,
    });
  });

  it("같은 칸이 두 번 있으면 한 번만 남긴다", () => {
    const r = mapLegacySlots(
      '["2026-03-01T18:00","2026-03-01T18:00:00"]',
      poll,
    );
    expect(r.slots).toHaveLength(1);
  });
});

describe("mapLegacyLocationVote", () => {
  const vote = {
    participant_id: "2",
    departure_name: null,
    departure_location: "서울 마포구 양화로 160",
    departure_lat: "37.5571000",
    departure_lng: "126.9245000",
  };

  it("label은 departure_name, 없으면 departure_location이고 좌표는 숫자다", () => {
    expect(mapLegacyLocationVote(vote)).toEqual({
      label: "서울 마포구 양화로 160",
      lat: 37.5571,
      lng: 126.9245,
    });
    expect(
      mapLegacyLocationVote({ ...vote, departure_name: "홍대입구" })?.label,
    ).toBe("홍대입구");
  });

  it("label은 100자로 자른다", () => {
    const long = "가".repeat(150);
    expect(
      mapLegacyLocationVote({ ...vote, departure_location: long })?.label,
    ).toHaveLength(100);
  });

  it("participant_id가 없는 표는 버린다", () => {
    expect(mapLegacyLocationVote({ ...vote, participant_id: null })).toBeNull();
  });
});

describe("mapLegacyConfirmedLocation", () => {
  it("이름과 좌표를 옮긴다", () => {
    expect(
      mapLegacyConfirmedLocation({
        confirmed_location: "합정역",
        confirmed_lat: "37.5495000",
        confirmed_lng: "126.9139000",
      }),
    ).toEqual({ name: "합정역", lat: 37.5495, lng: 126.9139 });
  });

  it("좌표가 null이면 버린다", () => {
    expect(
      mapLegacyConfirmedLocation({
        confirmed_location: "합정역",
        confirmed_lat: null,
        confirmed_lng: "126.9139000",
      }),
    ).toBeNull();
  });
});

describe("resolveLegacyConfirmation", () => {
  const confirmedPoll = mapLegacySchedulePoll({
    poll_status: "CONFIRMED",
    date_options: '["2026-03-07"]',
    start_time: 540,
    end_time: 1440,
    confirmed_start_time: null,
    confirmed_end_time: null,
    updated_at: "2026-03-05 21:00:00",
  });
  const at = (iso: string) => new Date(iso);

  it("확정 시간이 비어 있으면 순위 1위 시간으로 채운다", () => {
    const r = resolveLegacyConfirmation(confirmedPoll, [
      {
        participantId: 1,
        name: "1",
        slots: [at("2026-03-07T09:00:00Z"), at("2026-03-07T09:30:00Z")],
      },
      {
        participantId: 2,
        name: "2",
        slots: [at("2026-03-07T09:00:00Z"), at("2026-03-07T09:30:00Z")],
      },
      { participantId: 3, name: "3", slots: [at("2026-03-07T12:00:00Z")] },
    ]);
    expect(r.outcome).toBe("derived");
    expect(r.poll.confirmedStart?.toISOString()).toBe(
      "2026-03-07T09:00:00.000Z",
    );
    expect(r.poll.confirmedEnd?.toISOString()).toBe("2026-03-07T10:00:00.000Z");
    expect(r.poll.confirmedAt).toEqual(confirmedPoll.confirmedAt);
  });

  it("쓸 수 있는 표가 없으면 확정 전으로 되돌린다", () => {
    const r = resolveLegacyConfirmation(confirmedPoll, [
      { participantId: 1, name: "1", slots: [] },
    ]);
    expect(r.outcome).toBe("unconfirmed");
    expect(r.poll.confirmedAt).toBeNull();
    expect(r.poll.confirmedStart).toBeNull();
  });

  it("확정 시간이 있거나 확정 전이면 그대로 둔다", () => {
    const withTimes = {
      ...confirmedPoll,
      confirmedStart: at("2026-03-07T11:00:00Z"),
      confirmedEnd: at("2026-03-07T12:00:00Z"),
    };
    expect(resolveLegacyConfirmation(withTimes, []).poll).toBe(withTimes);
    const voting = { ...confirmedPoll, confirmedAt: null };
    expect(resolveLegacyConfirmation(voting, []).outcome).toBe("kept");
  });
});
