// @vitest-environment node
import { generateText } from "ai";
import {
  generateWithModel,
  MODEL_TIMEOUT_MS,
} from "@/server/ai/time-parse/parse-availability";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const poll = { dateOptions: ["2026-11-02"], startMinute: 540, endMinute: 1440 };

beforeEach(() => {
  vi.stubEnv("NVIDIA_API_KEY", "k");
  vi.stubEnv("NVIDIA_MODEL_PARSE", "test/model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(generateText).mockReset();
});

test("모델 호출은 한 번만 다시 시도하고 15초 뒤 끊는다", async () => {
  vi.mocked(generateText).mockResolvedValue({
    output: { ranges: [], summary: "" },
    usage: { inputTokens: 1, outputTokens: 2 },
  } as never);
  const timeout = vi.spyOn(AbortSignal, "timeout");

  await generateWithModel({ system: "s", user: "u", text: "t", poll });

  const options = vi.mocked(generateText).mock.calls[0]?.[0];
  expect(options?.maxRetries).toBe(1);
  expect(options?.abortSignal).toBeInstanceOf(AbortSignal);
  expect(MODEL_TIMEOUT_MS).toBe(15_000);
  expect(timeout).toHaveBeenCalledWith(15_000);
  timeout.mockRestore();
});
