// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Mazu } from "@/components/mazu/mazu";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { ParticipantChip } from "@/components/mazu/participant-chip";
import { StageProgress } from "@/components/mazu/stage-progress";

afterEach(cleanup);

test("64px 이상은 3D, 48px 이하는 2D를 쓴다", () => {
  render(
    <>
      <Mazu expression="happy" size={96} />
      <Mazu expression="happy" size={32} />
    </>,
  );
  const [big, small] = screen.getAllByRole("presentation");
  expect(big).toHaveAttribute("src", "/brand/3d/happy-256.png");
  expect(small).toHaveAttribute("src", "/brand/2d/happy.svg");
});

test("160px 이상은 512 렌더를 쓴다", () => {
  render(<Mazu expression="happy" size={240} />);
  expect(screen.getByRole("presentation")).toHaveAttribute(
    "src",
    "/brand/3d/happy-512.png",
  );
});

test("128px까지는 256 렌더를 쓴다", () => {
  render(<Mazu expression="happy" size={128} />);
  expect(screen.getByRole("presentation")).toHaveAttribute(
    "src",
    "/brand/3d/happy-256.png",
  );
});

test("alt를 주면 이미지로 읽힌다", () => {
  render(<Mazu expression="happy" size={64} alt="마주" />);
  expect(screen.getByRole("img", { name: "마주" })).toBeInTheDocument();
});

test("말풍선은 status 영역이고 로딩 중엔 생각 중 표정이다", () => {
  render(
    <MazuBubble expression="happy" state="loading">
      계산하고 있어요
    </MazuBubble>,
  );
  const region = screen.getByRole("status");
  expect(region).toHaveAttribute("aria-busy", "true");
  expect(region).toHaveAttribute("aria-live", "polite");
  expect(within(region).getByRole("presentation")).toHaveAttribute(
    "src",
    "/brand/2d/thinking.svg",
  );
});

test("말풍선은 기본 상태에서 주어진 표정과 action을 보여 준다", () => {
  render(
    <MazuBubble
      expression="sorry"
      state="error"
      action={<button type="button">다시 해볼게요</button>}
    >
      저장하지 못했어요
    </MazuBubble>,
  );
  const region = screen.getByRole("status");
  expect(region).not.toHaveAttribute("aria-busy", "true");
  expect(within(region).getByRole("presentation")).toHaveAttribute(
    "src",
    "/brand/2d/sorry.svg",
  );
  expect(within(region).getByText("마주")).toBeInTheDocument();
  expect(
    within(region).getByRole("button", { name: "다시 해볼게요" }),
  ).toBeInTheDocument();
});

test("참여자 칩은 응답 여부를 글자로 말한다", () => {
  render(
    <>
      <ParticipantChip name="서연" responded={false} />
      <ParticipantChip name="민준" responded />
    </>,
  );
  expect(screen.getByText("기다리는 중")).toBeInTheDocument();
  expect(screen.getByText("응답 완료")).toBeInTheDocument();
});

test("진행 단계는 현재 단계를 표시한다", () => {
  render(
    <StageProgress
      stages={["schedule", "location", "confirmed"]}
      current="location"
    />,
  );
  expect(screen.getByText("장소 모으기").closest("li")).toHaveAttribute(
    "aria-current",
    "step",
  );
  expect(screen.getByText("시간 모으기").closest("li")).not.toHaveAttribute(
    "aria-current",
  );
});
