/**
 * 말로 칠한 뒤 결과 줄 문장(COPY.md "말로 입력 결과").
 * AI 요약은 그대로 보여 주고, 요약이 칠한 것을 말하지 않으면 "N칸을 칠했어요."를 더한 뒤
 * "맞으면 저장해 주세요"로 끝맺는다. 투표 날짜 밖에서 뺀 칸이 있으면 안내 앞에 적는다.
 */
export function paintedMessage(
  summary: string,
  count: number,
  dropped: number,
) {
  const said = summary.trim();
  const parts = said ? [said] : [];
  if (!said.includes("칠했")) parts.push(`${count}칸을 칠했어요.`);
  if (dropped > 0) parts.push(`투표 날짜 밖의 ${dropped}칸은 뺐어요.`);
  parts.push("맞으면 저장해 주세요");
  return parts.join(" ");
}
