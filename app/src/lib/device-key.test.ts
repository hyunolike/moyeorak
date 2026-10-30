// @vitest-environment jsdom
import { DEVICE_KEY_PATTERN, getDeviceKey } from "@/lib/device-key";

const LEGACY = "3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d";

beforeEach(() => {
  window.localStorage.clear();
});

test("device_key가 없고 옛 앱 키만 있으면 그 UUID를 돌려주고 저장한다", () => {
  window.localStorage.setItem("moyeorak.session", LEGACY);
  expect(getDeviceKey()).toBe(LEGACY);
  expect(window.localStorage.getItem("device_key")).toBe(LEGACY);
});

test("둘 다 없으면 21자 새 키를 만든다", () => {
  const created = getDeviceKey();
  expect(created).toHaveLength(21);
  expect(window.localStorage.getItem("device_key")).toBe(created);
});

test("이미 있는 device_key를 옛 키보다 먼저 쓴다", () => {
  window.localStorage.setItem("device_key", "k".repeat(21));
  window.localStorage.setItem("moyeorak.session", LEGACY);
  expect(getDeviceKey()).toBe("k".repeat(21));
});

test("옛 키 자리에 이상한 값이 있으면 무시한다", () => {
  window.localStorage.setItem("moyeorak.session", "not a key!");
  expect(getDeviceKey()).toHaveLength(21);
});

test("DEVICE_KEY_PATTERN은 21자 키와 UUID만 받는다", () => {
  expect(DEVICE_KEY_PATTERN.test("a".repeat(21))).toBe(true);
  expect(DEVICE_KEY_PATTERN.test(LEGACY)).toBe(true);
  expect(DEVICE_KEY_PATTERN.test("a".repeat(20))).toBe(false);
  expect(DEVICE_KEY_PATTERN.test(LEGACY.toUpperCase())).toBe(false);
});
