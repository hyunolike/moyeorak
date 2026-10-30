import { formatDuration } from "@/components/location/format";
import type { Station } from "@/lib/api-types";

export function StationDetail({ station }: { station: Station }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p data-testid="station-name" className="text-h2 text-k-800">
          {station.name}
        </p>
        <p className="text-h1 text-k-900 mt-0.5">
          평균 {formatDuration(station.averageMinutes)}
        </p>
        {station.line && (
          <p className="text-b4 text-k-400 mt-1">{station.line}</p>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {station.perParticipant.map((person) => (
          <li
            key={person.name}
            data-testid="per-participant"
            className="border-k-100 bg-k-5 flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <span className="text-k-800 text-t2">{person.name}</span>
            <span className="text-b3 text-k-700">
              {person.minutes === null
                ? "대중교통으로 갈 수 없어요"
                : formatDuration(person.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
