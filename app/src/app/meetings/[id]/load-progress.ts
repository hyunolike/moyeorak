import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { MeetingProgress } from "@/lib/api-types";
import { meetingPreview } from "@/lib/meeting-preview";
import { getMeetingProgress } from "@/server/meeting/progress-service";

/** 한 요청 안에서 페이지와 generateMetadata가 같은 읽기를 나눠 쓴다. 없으면 404. */
export const loadProgress = cache(
  async (id: string): Promise<MeetingProgress> => {
    const progress = await getMeetingProgress(id);
    if (!progress) notFound();
    return JSON.parse(JSON.stringify(progress)) as MeetingProgress;
  },
);

/** 모임 하위 모든 페이지가 쓰는 링크 미리보기 메타데이터. */
export async function meetingMetadata(
  params: Promise<{ id: string }>,
): Promise<Metadata> {
  const { id } = await params;
  const { title, description } = meetingPreview(await loadProgress(id));
  const image = `/meetings/${id}/opengraph-image`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
