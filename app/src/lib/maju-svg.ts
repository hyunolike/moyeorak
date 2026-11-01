import {
  MAJU_SPRITES,
  type MajuExpression,
} from "@/components/brand/maju-sprites";
import { lineKey } from "@/components/map/line-color";
import * as C from "@/lib/brand-colors";

/** ImageResponse(satori)용 마주. CSS 변수를 못 읽으므로 brand-colors 상수로 칠한 SVG 데이터 주소다. */
export function majuDataUri(expression: MajuExpression): string {
  const s = MAJU_SPRITES.normal[expression];
  const ink = C.INK_900;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">`,
    `<path fill="${C.TANGERINE_500}" d="${s.face}"/>`,
    s.band ? `<path fill="${ink}" fill-rule="evenodd" d="${s.band}"/>` : "",
    `<path fill="${ink}" d="${s.mouth}"/>`,
    ...s.eyes.map((d) => `<path fill="${ink}" d="${d}"/>`),
    "</svg>",
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const LINE_HEX: Record<string, string> = {
  "1": C.LINE_1,
  "2": C.LINE_2,
  "3": C.LINE_3,
  "4": C.LINE_4,
  "5": C.LINE_5,
  "6": C.LINE_6,
  "7": C.LINE_7,
  "8": C.LINE_8,
  "9": C.LINE_9,
  gyeongui: C.LINE_GYEONGUI,
  sinbundang: C.LINE_SINBUNDANG,
};

/** 노선 이름의 16진 색. 모르는 노선과 null은 잉크 400. */
export function lineHex(line: string | null): string {
  const key = lineKey(line);
  return (key && LINE_HEX[key]) || C.INK_400;
}
