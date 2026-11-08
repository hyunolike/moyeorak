import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RespondByPicker } from "@/components/meeting/respond-by-picker";
import { respondByOptions } from "@/lib/respond-by";

afterEach(cleanup);

test("정하지 않음이 기본이고 보기를 누르면 key를 알린다", () => {
  const onChange = vi.fn();
  const options = respondByOptions(new Date("2026-11-02T03:00:00Z"), null);
  render(
    <RespondByPicker value={null} options={options} onChange={onChange} />,
  );
  expect(
    screen
      .getByRole("button", { name: "정하지 않음" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "내일 밤 10시" }));
  expect(onChange).toHaveBeenCalledWith("tomorrow");
});
