import { newId } from "./nanoid";

test("newId는 21자 NanoId를 만든다", () => {
  expect(newId()).toMatch(/^[A-Za-z0-9_-]{21}$/);
  expect(newId()).not.toBe(newId());
});
