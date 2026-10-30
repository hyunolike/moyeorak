import { newId } from "@/lib/nanoid";

const DEVICE_KEY = "device_key";
const PARTICIPANTS_KEY = "my_participants";

/** 이 브라우저를 가리키는 키. 클라이언트에서만 부른다. */
export function getDeviceKey(): string {
  const saved = window.localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const created = newId();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function readParticipants(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(PARTICIPANTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

/** 이 브라우저가 모임에 참여했을 때 받은 participantId. 없으면 null. */
export function getStoredParticipantId(meetingId: string): number | null {
  const id = readParticipants()[meetingId];
  return typeof id === "number" ? id : null;
}

export function storeParticipantId(meetingId: string, participantId: number) {
  window.localStorage.setItem(
    PARTICIPANTS_KEY,
    JSON.stringify({ ...readParticipants(), [meetingId]: participantId }),
  );
}
