// @vitest-environment node
import { AiConfigError, AiLimitError } from "@/server/ai/errors";
import { toResponse } from "@/server/http";

test("AiLimitError는 429 AI_LIMIT으로 직렬화된다", async () => {
  const res = await toResponse(async () => {
    throw new AiLimitError();
  });
  expect(res.status).toBe(429);
  expect((await res.json()).error.code).toBe("AI_LIMIT");
});

test("AiConfigError는 500 AI_CONFIG로 직렬화된다", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const res = await toResponse(async () => {
    throw new AiConfigError("NVIDIA_API_KEY");
  });
  spy.mockRestore();
  expect(res.status).toBe(500);
  expect((await res.json()).error.code).toBe("AI_CONFIG");
});
