"use client";

import { useState } from "react";
import { usePlaceSearch } from "@/lib/api";
import type { Place } from "@/lib/api-types";

/** 장소 키워드를 검색해 고른 결과를 onPick으로 넘긴다. */
export function PlaceSearch({
  onPick,
  disabled = false,
}: {
  onPick: (place: Place) => void;
  disabled?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [submitted, setSubmitted] = useState("");
  const search = usePlaceSearch(submitted);
  const results = search.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(keyword.trim());
        }}
      >
        <input
          aria-label="출발지 검색"
          placeholder="지하철역, 아파트 이름 등으로 검색"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          autoComplete="off"
          className="bg-k-50 text-b2 text-k-900 caret-primary-main placeholder:text-k-400 focus:border-primary-main focus:bg-k-5 min-w-0 flex-1 rounded-xl border border-transparent px-4 py-3 outline-none"
        />
        <button
          type="submit"
          disabled={!keyword.trim()}
          className="bg-k-800 text-b3 text-k-5 disabled:bg-k-100 disabled:text-k-400 shrink-0 cursor-pointer rounded-xl px-4 disabled:cursor-not-allowed"
        >
          검색
        </button>
      </form>

      {search.isFetching && (
        <p className="text-b4 text-k-400 py-4 text-center">검색 중...</p>
      )}
      {search.isError && (
        <p className="text-action-red text-b4 py-4 text-center">
          장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {!search.isFetching && search.isSuccess && results.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-k-700 text-t2">일치하는 주소가 없어요</p>
          <p className="text-b4 text-k-500 mt-1">
            검색한 지역을 다시 확인해 보세요.
          </p>
        </div>
      )}
      {!search.isFetching && results.length > 0 && (
        <ul className="flex flex-col">
          {results.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                data-testid="place-result"
                disabled={disabled}
                onClick={() => onPick(place)}
                className="border-k-100 bg-k-5 hover:bg-k-10 active:bg-k-50 flex w-full cursor-pointer flex-col border-b px-1 py-4 text-left transition-colors"
              >
                <span className="text-b1 text-k-750 truncate">
                  {place.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
