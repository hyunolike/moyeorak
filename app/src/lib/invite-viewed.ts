const storageKey = (meetingId: string) => `moyeorak:invite-viewed:${meetingId}`;

/**
 * 참여하지 않은 사람이 초대 화면을 처음 봤을 때 한 번만 send를 부른다(퍼널의 "링크 열림").
 * 같은 기기에서 다시 열면 보내지 않는다. 저장소를 쓸 수 없는 브라우저(비공개 모드 등)는
 * 그 화면을 열 때마다 보낼 수 있지만, 기록을 놓치는 것보다 낫다고 본다.
 */
export function markInviteViewed(
  meetingId: string,
  send: (meetingId: string) => void,
): void {
  try {
    if (window.localStorage.getItem(storageKey(meetingId))) return;
    window.localStorage.setItem(storageKey(meetingId), "1");
  } catch {
    // 저장소를 못 쓰면 중복을 막지 못한 채 보낸다.
  }
  send(meetingId);
}
