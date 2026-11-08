import { headers } from "next/headers";
import { Suspense } from "react";
import { Skeleton } from "@/components/layout/skeleton";
import { adminTokenFrom, isAdminToken } from "@/server/admin-auth";
import { computeAiUsage } from "@/server/metrics/ai-usage";
import { computeFunnel } from "@/server/metrics/compute-funnel";
import { computeMetrics, type Metrics } from "@/server/metrics/compute-metrics";

const pct = (n: number | null) =>
  n === null ? "–" : `${(n * 100).toFixed(1)}%`;
const hours = (n: number | null) => (n === null ? "–" : n.toFixed(1));
const count = (n: number | null) => (n === null ? "–" : n.toFixed(2));

const rows: { label: string; note?: string; value: (m: Metrics) => string }[] =
  [
    { label: "모임 수", value: (m) => String(m.meetings) },
    { label: "확정률", value: (m) => pct(m.confirmationRate) },
    { label: "참여 완료율", value: (m) => pct(m.participationRate) },
    {
      label: "생성에서 확정까지(중앙값, 시간)",
      value: (m) => hours(m.medianHoursToConfirm),
    },
    { label: "재사용률", value: (m) => pct(m.reuseRate) },
    {
      label: "모임당 공유 수",
      note: "재촉 메시지는 2026-11-08부터 따로 센다",
      value: (m) => count(m.sharesPerMeeting),
    },
    { label: "제안 수락률", value: (m) => pct(m.suggestionAcceptRate) },
    { label: "목적을 고른 모임", value: (m) => pct(m.purposeRate) },
    {
      label: "재촉 뒤 24시간 안에 응답한 모임",
      value: (m) => pct(m.nudgeResponseRate),
    },
    {
      label: "말 입력 그대로 저장한 비율",
      value: (m) => pct(m.textVoteKeptRate),
    },
    {
      label: "모임당 다른 제안 보기",
      value: (m) => count(m.skippedPerMeeting),
    },
    { label: "모임당 다시 제안", value: (m) => count(m.resuggestedPerMeeting) },
    {
      label: "같은 멤버로 다시 모인 모임",
      value: (m) => String(m.regatheredMeetings),
    },
    { label: "카카오 카드 공유 비율", value: (m) => pct(m.kakaoShareRate) },
  ];

const cell = "border-border border-b px-2 py-2.5";
const num = `${cell} text-right`;

async function MetricsTable() {
  const to = new Date();
  const [recent, all] = await Promise.all([
    computeMetrics({ from: new Date(to.getTime() - 30 * 86_400_000), to }),
    computeMetrics({ from: new Date(0), to }),
  ]);
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-muted text-right">
          <th className={`${cell} text-left`}>지표</th>
          <th className={cell}>최근 30일</th>
          <th className={cell}>전체</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className={cell}>
              {r.label}
              {r.note && <p className="text-muted text-c1">{r.note}</p>}
            </td>
            <td className={num}>{r.value(recent)}</td>
            <td className={num}>{r.value(all)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 최근 30일 모임이 어느 단계에서 멈추는지. "전체 대비"는 생성 대비, "이전 대비"는 바로 앞 단계 대비다.
 * "링크 열림"은 2026-11-02 배포부터 기록해서 그 전 모임은 0으로 잡힌다.
 */
async function FunnelTable() {
  const to = new Date();
  const f = await computeFunnel({
    from: new Date(to.getTime() - 30 * 86_400_000),
    to,
  });
  const created = f.stages[0]?.count ?? 0;
  const ratio = (n: number, base: number) =>
    base ? `${((n / base) * 100).toFixed(1)}%` : "–";
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-muted text-right">
            <th className={`${cell} text-left`}>단계</th>
            <th className={cell}>모임</th>
            <th className={cell}>전체 대비</th>
            <th className={cell}>이전 대비</th>
          </tr>
        </thead>
        <tbody>
          {f.stages.map((s, i) => (
            <tr key={s.key}>
              <td className={cell}>{s.label}</td>
              <td className={num}>{s.count}</td>
              <td className={num}>{ratio(s.count, created)}</td>
              <td className={num}>
                {i === 0 ? "–" : ratio(s.count, f.stages[i - 1].count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted text-c1 mt-2">
        각 단계는 그 단계나 그 뒤 단계까지 간 모임이에요. 링크를 열어 본 사람 중
        참여: {pct(f.viewToJoinRate)}
      </p>
    </>
  );
}

async function AiUsageTable() {
  const to = new Date();
  const usage = await computeAiUsage({
    from: new Date(to.getTime() - 30 * 86_400_000),
    to,
  });
  const heads = [
    "용도",
    "호출",
    "실패",
    "평균 지연(ms)",
    "입력 토큰",
    "출력 토큰",
  ];
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-muted text-right">
          {heads.map((h, i) => (
            <th
              key={h}
              className={`${cell} ${i === 0 ? "text-left" : "text-right"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {usage.length === 0 && (
          <tr>
            <td className={cell} colSpan={heads.length}>
              아직 호출이 없어요
            </td>
          </tr>
        )}
        {usage.map((u) => (
          <tr key={u.purpose}>
            <td className={cell}>{u.purpose}</td>
            {[
              u.calls,
              u.failed,
              u.avgLatencyMs,
              u.inputTokens,
              u.outputTokens,
            ].map((n, i) => (
              <td key={heads[i + 1]} className={num}>
                {n.toLocaleString("ko-KR")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const auth = (await headers()).get("authorization");
  if (!isAdminToken(adminTokenFrom(auth, token)))
    return <p>접근 권한이 없어요</p>;
  return (
    <>
      <h1 className="text-h2 text-text mb-4">모임 지표</h1>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <MetricsTable />
      </Suspense>
      <h2 className="text-t2 text-text mt-6 mb-2">단계별 이탈(최근 30일)</h2>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <FunnelTable />
      </Suspense>
      <h2 className="text-t2 text-text mt-6 mb-2">AI 사용량(최근 30일)</h2>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <AiUsageTable />
      </Suspense>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <main className="text-text mx-auto max-w-[480px] px-4 py-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
