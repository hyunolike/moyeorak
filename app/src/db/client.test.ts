// @vitest-environment node
import { postgresOptions } from "@/db/client";

test("Neon 풀러에서 쓸 수 있게 prepared statement를 끈다", () => {
  expect(postgresOptions()).toEqual({
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
});
