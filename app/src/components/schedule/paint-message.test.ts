import { paintedMessage } from "@/components/schedule/paint-message";

describe("paintedMessage", () => {
  it("요약이 칠한 것을 말하면 요약 뒤에 저장 안내를 붙인다", () => {
    expect(paintedMessage("평일 저녁을 칠했어요.", 12, 0)).toBe(
      "평일 저녁을 칠했어요. 맞으면 저장해 주세요",
    );
  });

  it("요약이 칠한 것을 말하지 않으면 칸 수를 함께 말한다", () => {
    expect(paintedMessage("평일 저녁이 된다고 하셨어요.", 6, 0)).toBe(
      "평일 저녁이 된다고 하셨어요. 6칸을 칠했어요. 맞으면 저장해 주세요",
    );
  });

  it("요약이 비어 있으면 칸 수 문장만", () => {
    expect(paintedMessage("  ", 6, 0)).toBe(
      "6칸을 칠했어요. 맞으면 저장해 주세요",
    );
  });

  it("투표 날짜 밖에서 뺀 칸은 안내 앞에 적는다", () => {
    expect(paintedMessage("평일 저녁을 칠했어요.", 12, 3)).toBe(
      "평일 저녁을 칠했어요. 투표 날짜 밖의 3칸은 뺐어요. 맞으면 저장해 주세요",
    );
  });
});
