import { type Pick, templateReason } from "@/server/ai/suggest/templates";

/** MOCK_EXTERNAL=1일 때 모델 대신 쓰는 응답. 문장 틀에 " (모의)"를 붙인다. */
export function mockReasons(picks: Pick[], respondedCount: number) {
  return {
    reasons: picks.map((p) => `${templateReason(p, respondedCount)} (모의)`),
  };
}
