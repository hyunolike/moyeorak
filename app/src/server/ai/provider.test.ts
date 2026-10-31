// @vitest-environment node
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  toGuidedJson,
  withStructuredOutputFallback,
} from "@/server/ai/provider";

const schema = z.object({ ok: z.boolean() });

function completion(content: string) {
  return Response.json({
    id: "c",
    object: "chat.completion",
    created: 0,
    model: "m",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
  });
}

beforeEach(() => {
  vi.stubEnv("NVIDIA_API_KEY", "k");
  vi.stubEnv("NVIDIA_MODEL_PARSE", "nvidia/parse-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("toGuidedJson은 json_schema를 nvext.guided_json으로 옮긴다", () => {
  const body = {
    model: "m",
    response_format: {
      type: "json_schema",
      json_schema: { name: "response", schema: { type: "object" } },
    },
  };
  expect(toGuidedJson(body)).toEqual({
    model: "m",
    nvext: { guided_json: { type: "object" } },
  });
  expect(toGuidedJson({ model: "m" })).toEqual({ model: "m" });
});

test("response_format이 400이면 같은 호출을 guided_json으로 다시 보낸다", async () => {
  const bodies: Record<string, unknown>[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    if (body.response_format) {
      return Response.json(
        { error: { message: "response_format not supported" } },
        { status: 400 },
      );
    }
    return completion('{"ok":true}');
  });

  const out = await withStructuredOutputFallback("parse", async (model) => {
    const r = await generateText({
      model,
      prompt: "hi",
      maxRetries: 0,
      output: Output.object({ schema }),
    });
    return r.output;
  });

  expect(out).toEqual({ ok: true });
  expect(bodies).toHaveLength(2);
  expect(bodies[0].response_format).toMatchObject({ type: "json_schema" });
  expect(bodies[1].response_format).toBeUndefined();
  expect(bodies[1].nvext).toMatchObject({
    guided_json: { type: "object" },
  });
});

test("400이 아닌 오류는 다시 보내지 않는다", async () => {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      Response.json({ error: { message: "down" } }, { status: 503 }),
    );
  await expect(
    withStructuredOutputFallback("parse", (model) =>
      generateText({ model, prompt: "hi", maxRetries: 0 }),
    ),
  ).rejects.toThrow();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
