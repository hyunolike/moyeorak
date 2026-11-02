// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { NearbyPlacesView } from "@/components/meeting/nearby-places";
import type { NearbyPlaces } from "@/lib/api-types";

afterEach(cleanup);

const nearby: NearbyPlaces = {
  food: [
    {
      id: "1",
      name: "고기집",
      category: "육류,고기",
      distance: 130,
      url: "https://place.map.kakao.com/1",
    },
  ],
  cafe: [
    {
      id: "2",
      name: "카페 하나",
      category: "카페",
      distance: 400,
      url: "https://place.map.kakao.com/2",
    },
  ],
};

test("식당과 카페를 나눠 보여 주고 각 줄은 카카오맵 장소 페이지로 연다", () => {
  render(<NearbyPlacesView stationName="녹사평역" nearby={nearby} />);
  const section = screen.getByRole("region", {
    name: "근처에서 만나기 좋은 곳",
  });
  expect(
    within(section).getByText("녹사평역에서 걸어서 갈 만한 곳이에요"),
  ).toBeInTheDocument();
  const food = within(section).getByRole("list", { name: "식당" });
  const link = within(food).getByRole("link", { name: /고기집/ });
  expect(link).toHaveAttribute("href", "https://place.map.kakao.com/1");
  expect(link).toHaveAttribute("target", "_blank");
  // 분당 67m(시속 4km)로 걸어서 몇 분인지 적는다.
  expect(link).toHaveTextContent("도보 2분");
  expect(within(section).getByRole("list", { name: "카페" })).toHaveTextContent(
    "카페 하나",
  );
});

test("한쪽이 비면 그 묶음만 빼고, 둘 다 비면 섹션을 그리지 않는다", () => {
  const { container, rerender } = render(
    <NearbyPlacesView
      stationName="녹사평역"
      nearby={{ food: nearby.food, cafe: [] }}
    />,
  );
  expect(screen.queryByRole("list", { name: "카페" })).toBeNull();
  rerender(
    <NearbyPlacesView stationName="녹사평역" nearby={{ food: [], cafe: [] }} />,
  );
  expect(container).toBeEmptyDOMElement();
  rerender(<NearbyPlacesView stationName="녹사평역" nearby={undefined} />);
  expect(container).toBeEmptyDOMElement();
});
