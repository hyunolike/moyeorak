import type { MeetingProgress } from "@/lib/api-types";
import { confirmedSentence, respondedCount } from "@/lib/home-state";

export type MeetingPreview = {
  title: string;
  description: string;
};

/** 카카오톡 같은 곳에 모임 링크를 붙였을 때 보이는 제목과 설명. */
export function meetingPreview(p: MeetingProgress): MeetingPreview {
  const title = `${p.hostName}님의 모임`;
  if (p.status === "confirmed") {
    return {
      title,
      description: confirmedSentence(p),
    };
  }
  const n = respondedCount(p);
  const ask =
    p.status === "locating"
      ? "출발지를 남겨 주세요."
      : "가능한 시간을 남겨 주세요.";
  return {
    title,
    description: `${ask} ${p.participantCount}명 중 ${n}명이 응답했어요.`,
  };
}
