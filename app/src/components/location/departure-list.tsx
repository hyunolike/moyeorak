"use client";

import { Avatar, ListRow } from "@/components/layout/list-row";
import type { Departure } from "@/lib/api-types";

const textButton =
  "text-muted text-b3 h-10 cursor-pointer rounded-sm px-2 active:bg-surface-sunken";

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
      <p className="text-b4 text-muted px-5 py-6 text-center">
        아직 등록된 출발지가 없어요
      </p>
    );
  }

  return (
    <ul aria-label="등록된 출발지">
      {departures.map((departure) => {
        const isMine = departure.participantId === myParticipantId;
        return (
          <li key={departure.voteId} data-testid="departure-item">
            <div data-testid={isMine ? "my-departure" : undefined}>
              <ListRow
                leading={<Avatar>{departure.name.slice(0, 1)}</Avatar>}
                title={
                  <>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{departure.name}</span>
                      {isMine ? (
                        // 버튼과 헷갈리지 않게 배경 없는 글자 라벨로 이름 옆에 둔다.
                        <span
                          data-me-label
                          className="text-action-text text-c1 shrink-0"
                        >
                          나
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted text-b4 block truncate">
                      {departure.label}
                    </span>
                  </>
                }
                trailing={
                  isMine ? (
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={onEdit}
                        className={textButton}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(departure.voteId)}
                        className={textButton}
                      >
                        삭제
                      </button>
                    </span>
                  ) : null
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
