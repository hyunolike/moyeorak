import { headers } from "next/headers";
import { Suspense } from "react";
import { adminTokenFrom, isAdminToken } from "@/server/admin-auth";
import { computeAiUsage } from "@/server/metrics/ai-usage";
import { computeMetrics, type Metrics } from "@/server/metrics/compute-metrics";

const wrap = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "24px 16px",
  color: "var(--color-k-900)",
} as const;

const pct = (n: number | null) =>
  n === null ? "–" : `${(n * 100).toFixed(1)}%`;
const hours = (n: number | null) => (n === null ? "–" : n.toFixed(1));
const count = (n: number | null) => (n === null ? "–" : n.toFixed(2));

const rows: { label: string; value: (m: Metrics) => string }[] = [
  { label: "모임 수", value: (m) => String(m.meetings) },
  { label: "확정률", value: (m) => pct(m.confirmationRate) },
  { label: "참여 완료율", value: (m) => pct(m.participationRate) },
  {
    label: "생성에서 확정까지(중앙값, 시간)",
    value: (m) => hours(m.medianHoursToConfirm),
  },
  { label: "재사용률", value: (m) => pct(m.reuseRate) },
  { label: "모임당 공유 수", value: (m) => count(m.sharesPerMeeting) },
  { label: "제안 수락률", value: (m) => pct(m.suggestionAcceptRate) },
];

const cell = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--color-k-100)",
} as const;

async function MetricsTable() {
  const to = new Date();
  const [recent, all] = await Promise.all([
    computeMetrics({ from: new Date(to.getTime() - 30 * 86_400_000), to }),
    computeMetrics({ from: new Date(0), to }),
  ]);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "var(--color-k-600)", textAlign: "right" }}>
          <th style={{ ...cell, textAlign: "left" }}>지표</th>
          <th style={cell}>최근 30일</th>
          <th style={cell}>전체</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td style={cell}>{r.label}</td>
            <td style={{ ...cell, textAlign: "right" }}>{r.value(recent)}</td>
            <td style={{ ...cell, textAlign: "right" }}>{r.value(all)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "var(--color-k-600)", textAlign: "right" }}>
          {heads.map((h, i) => (
            <th
              key={h}
              style={{ ...cell, textAlign: i === 0 ? "left" : "right" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {usage.length === 0 && (
          <tr>
            <td style={cell} colSpan={heads.length}>
              아직 호출이 없어요
            </td>
          </tr>
        )}
        {usage.map((u) => (
          <tr key={u.purpose}>
            <td style={cell}>{u.purpose}</td>
            {[
              u.calls,
              u.failed,
              u.avgLatencyMs,
              u.inputTokens,
              u.outputTokens,
            ].map((n, i) => (
              <td key={heads[i + 1]} style={{ ...cell, textAlign: "right" }}>
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
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>모임 지표</h1>
      <Suspense fallback={<p>불러오는 중이에요</p>}>
        <MetricsTable />
      </Suspense>
      <h2 style={{ fontSize: 16, margin: "24px 0 8px" }}>
        AI 사용량(최근 30일)
      </h2>
      <Suspense fallback={<p>불러오는 중이에요</p>}>
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
    <main style={wrap}>
      <Suspense fallback={<p>불러오는 중이에요</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
