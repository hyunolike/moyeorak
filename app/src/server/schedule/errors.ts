export class InvalidSlotsError extends Error {
  readonly code = "INVALID_SLOTS";
  readonly invalid: Date[];
  /** toResponse가 오류 본문에 그대로 펼쳐 넣는다. */
  readonly details: { invalid: string[] };
  constructor(invalid: Date[]) {
    super("선택할 수 없는 시간이 포함되어 있어요");
    this.name = "InvalidSlotsError";
    this.invalid = invalid;
    this.details = { invalid: invalid.map((d) => d.toISOString()) };
  }
}
