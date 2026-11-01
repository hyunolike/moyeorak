import { render, screen } from "@testing-library/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

test("선택된 항목은 연한 탠저린 바탕을 쓴다", () => {
  render(
    <ToggleGroup defaultValue={["both"]}>
      <ToggleGroupItem value="schedule">시간만</ToggleGroupItem>
      <ToggleGroupItem value="both">둘 다</ToggleGroupItem>
    </ToggleGroup>,
  );
  const on = screen.getByRole("button", { name: "둘 다" });
  expect(on.getAttribute("aria-pressed")).toBe("true");
  expect(on.className).toMatch(/aria-pressed:bg-selected/);
});
