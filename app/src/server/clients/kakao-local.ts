import { ExternalApiError } from "@/server/clients/errors";

export type Place = { label: string; lat: number; lng: number };

const MOCK_PLACES: Place[] = [
  { label: "합정역 2호선", lat: 37.5495, lng: 126.9138 },
  { label: "홍대입구역 2호선", lat: 37.5568, lng: 126.9237 },
  { label: "신촌역 2호선", lat: 37.5551, lng: 126.9368 },
];

export async function searchPlaces(keyword: string): Promise<Place[]> {
  if (process.env.MOCK_EXTERNAL === "1") return MOCK_PLACES;

  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=10`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!res.ok) throw new ExternalApiError();

  const body = (await res.json()) as {
    documents?: { place_name: string; x: string; y: string }[];
  };
  return (body.documents ?? []).map((d) => ({
    label: d.place_name,
    lat: Number(d.y),
    lng: Number(d.x),
  }));
}
