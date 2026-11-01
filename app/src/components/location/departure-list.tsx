"use client";

import { Avatar, ListRow } from "@/components/layout/list-row";
import { StatusChip } from "@/components/layout/status-chip";
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
                    <span className="block truncate">{departure.name}</span>
                    <span className="text-muted text-b4 block truncate">
                      {departure.label}
                    </span>
                  </>
                }
                trailing={
                  isMine ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <StatusChip tone="selected">나</StatusChip>
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
