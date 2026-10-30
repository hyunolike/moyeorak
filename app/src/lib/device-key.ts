import { newId } from "@/lib/nanoid";

const DEVICE_KEY = "device_key";
/** 옛 앱이 참여자 키(UUID)를 저장하던 자리. */
const LEGACY_SESSION_KEY = "moyeorak.session";

/** 새 키(nanoid 21자)와 옛 앱 UUID(36자)를 모두 받는다. 서버와 같이 쓴다. */
export const DEVICE_KEY_PATTERN =
  /^(?:[A-Za-z0-9_-]{21}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const PARTICIPANTS_KEY = "my_participants";

/** 이 브라우저를 가리키는 키. 클라이언트에서만 부른다. */
export function getDeviceKey(): string {
  const saved = window.localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const legacy = window.localStorage.getItem(LEGACY_SESSION_KEY);
  if (legacy && DEVICE_KEY_PATTERN.test(legacy)) {
    window.localStorage.setItem(DEVICE_KEY, legacy);
    return legacy;
  }
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
