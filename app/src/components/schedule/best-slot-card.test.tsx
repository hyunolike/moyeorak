// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { BestSlotCard } from "@/components/schedule/best-slot-card";

afterEach(cleanup);

test("가능 칩은 4.5:1 이상인 글자색을 쓴다", () => {
  render(
    <ul>
      <BestSlotCard
        index={1}
        participantCount={4}
        defaultExpanded
        slot={{
          start: "2026-11-07T14:00:00+09:00",
          end: "2026-11-07T16:00:00+09:00",
          available: ["현호", "서연"],
          unavailable: ["지우"],
        }}
      />
    </ul>,
  );
  expect(screen.getByText("가능 2").className).toMatch(/text-tangerine-800/);
});
