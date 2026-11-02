import { NAME_MAX_LENGTH, participantName } from "@/lib/participant-name";

test("이름은 10자까지 받는다(영문 닉네임이나 동명이인 구분을 위해)", () => {
  expect(NAME_MAX_LENGTH).toBe(10);
  expect(participantName.parse("Alexander9")).toBe("Alexander9");
  expect(participantName.safeParse("Alexander10").success).toBe(false);
});

test("앞뒤 공백은 지우고, 비어 있으면 받지 않는다", () => {
  expect(participantName.parse("  민지 B  ")).toBe("민지 B");
  expect(participantName.safeParse("   ").success).toBe(false);
});
