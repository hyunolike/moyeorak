"use client";

import type { Departure } from "@/lib/api-types";

export function DepartureList({
  departures,
  myParticipantId,
  onEdit,
  onDelete,
}: {
  departures: Departure[];
  myParticipantId: number;
  onEdit: () => void;
  onDelete: (voteId: number) => void;
}) {
  if (departures.length === 0) {
    return (
      <p className="text-b4 text-k-500 py-6 text-center">
        아직 등록된 출발지가 없어요
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {departures.map((departure) => {
        const isMine = departure.participantId === myParticipantId;
        return (
          <li
            key={departure.voteId}
            data-testid="departure-item"
            className="border-k-100 border-b py-4"
          >
            <div
              data-testid={isMine ? "my-departure" : undefined}
              className="flex items-center gap-3"
            >
              <span className="bg-p-50 text-c1 text-primary-main grid size-9 shrink-0 place-items-center rounded-full">
                {departure.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1">
                  <span className="text-k-800 text-t2 truncate">
                    {departure.name}
                  </span>
                  {isMine && (
                    <span className="bg-p-50 text-c1 text-primary-main shrink-0 rounded-[4px] px-1.5">
                      나
                    </span>
                  )}
                </p>
                <p className="text-b5 text-k-500 truncate">{departure.label}</p>
              </div>
              {isMine && (
                <div className="text-b4 flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="text-k-600 cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(departure.voteId)}
                    className="text-k-600 cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
