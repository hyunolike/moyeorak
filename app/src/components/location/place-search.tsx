"use client";

import { useState } from "react";
import { Avatar, ListRow } from "@/components/layout/list-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <Input
          aria-label="출발지 검색"
          placeholder="지하철역, 아파트 이름 등으로 검색"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 flex-1 px-4"
        />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={!keyword.trim()}
        >
          검색
        </Button>
      </form>

      {search.isFetching && (
        <p className="text-b4 text-muted py-4 text-center">검색 중...</p>
      )}
      {search.isError && (
        <p className="text-error text-b4 py-4 text-center">
          장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {!search.isFetching && search.isSuccess && results.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-text text-t2">일치하는 주소가 없어요</p>
          <p className="text-b4 text-muted mt-1">
            검색한 지역을 다시 확인해 보세요.
          </p>
        </div>
      )}
      {!search.isFetching && results.length > 0 && (
        <ul className="-mx-5 flex flex-col">
          {results.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                data-testid="place-result"
                disabled={disabled}
                onClick={() => onPick(place)}
                className="active:bg-surface-sunken block w-full cursor-pointer text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ListRow
                  leading={<Avatar>{place.label.slice(0, 1)}</Avatar>}
                  title={place.label}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
