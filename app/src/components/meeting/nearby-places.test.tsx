// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { NearbyPlacesView } from "@/components/meeting/nearby-places";
import type { NearbyGroup } from "@/lib/api-types";

afterEach(cleanup);

const groups: NearbyGroup[] = [
  {
    purpose: "meal",
    label: "음식점",
    places: [
      {
        name: "고기집",
        category: "육류,고기",
        distanceMeters: 130,
        url: "https://place.map.kakao.com/1",
      },
    ],
  },
  {
    purpose: "drink",
    label: "술집",
    places: [
      {
        name: "한잔",
        category: "호프",
        distanceMeters: 400,
        url: "https://place.map.kakao.com/2",
      },
    ],
  },
];

test("목적별로 나눠 보여 주고 각 줄은 카카오맵 장소 페이지를 새 탭으로 연다", () => {
  render(<NearbyPlacesView stationName="녹사평역" groups={groups} />);
  const section = screen.getByRole("region", {
    name: "근처에서 만나기 좋은 곳",
  });
  expect(
    within(section).getByText("녹사평역에서 걸어서 갈 만한 곳이에요"),
  ).toBeInTheDocument();
  const meal = within(section).getByRole("list", { name: "음식점" });
  const link = within(meal).getByRole("link", { name: /고기집/ });
  expect(link).toHaveAttribute("href", "https://place.map.kakao.com/1");
  expect(link).toHaveAttribute("target", "_blank");
  // 분당 67m(시속 4km)로 걸어서 몇 분인지 적는다.
  expect(link).toHaveTextContent("도보 2분");
  expect(within(section).getByRole("list", { name: "술집" })).toHaveTextContent(
    "한잔",
  );
});

test("비어 있으면 섹션을 숨긴다", () => {
  const { container, rerender } = render(
    <NearbyPlacesView
      stationName="녹사평역"
      groups={[{ ...groups[0], places: [] } as NearbyGroup]}
    />,
  );
  expect(container).toBeEmptyDOMElement();
  rerender(<NearbyPlacesView stationName="녹사평역" groups={[]} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<NearbyPlacesView stationName="녹사평역" groups={undefined} />);
  expect(container).toBeEmptyDOMElement();
});

test("한쪽 묶음만 비면 그 묶음만 뺀다", () => {
  render(
    <NearbyPlacesView
      stationName="녹사평역"
      groups={[
        groups[0] as NearbyGroup,
        { ...groups[1], places: [] } as NearbyGroup,
      ]}
    />,
  );
  expect(screen.queryByRole("list", { name: "술집" })).toBeNull();
  expect(screen.getByRole("list", { name: "음식점" })).toBeInTheDocument();
});
