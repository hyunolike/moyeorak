"use client";

import { useEffect, useRef, useState } from "react";
import { Maju } from "@/components/brand/maju";
import { cn } from "@/lib/cn";

const STEP_MS = 120;

/** 움직임 줄이기 설정을 읽는다. 서버 렌더에서는 거짓으로 시작해 마운트 뒤에 맞춘다. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduce(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/**
 * 첫 화면의 단톡방 장면. 내용은 정적이고, 처음 화면에 들어올 때
 * 위에서부터 120ms 간격으로 한 줄씩 나타난다. 움직임 줄이기 설정이면 바로 보인다.
 */
export function ChatScene() {
  const instant = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // order번째 줄: 처음 보이기 전에는 숨겨 두고, 보이면 order x 120ms 늦게 나타난다
  const reveal = (order: number) => ({
    className: cn(
      "transition-[opacity,transform] duration-(--duration-open) ease-(--ease-standard) motion-reduce:transition-none",
      !instant &&
        !shown &&
        "translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
    ),
    style: instant ? undefined : { transitionDelay: `${order * STEP_MS}ms` },
  });

  const bubble = "bg-bg text-b4 rounded-md rounded-tl-sm px-3 py-2";
  const avatar =
    "bg-ink-200 text-c1 grid size-[30px] flex-none place-items-center rounded-sm font-bold";

  const head = reveal(0);
  const text = reveal(1);
  const card = reveal(2);
  const reply1 = reveal(3);
  const reply2 = reveal(4);
  const result = reveal(5);

  return (
    <section
      ref={ref}
      data-scene
      data-reveal={instant ? "instant" : "stagger"}
      aria-label="단톡방에서 링크로 약속을 정하는 장면"
      className="bg-surface-sunken mt-[22px] flex flex-col gap-2.5 rounded-lg px-3.5 py-4"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(avatar, head.className)}
          style={head.style}
        >
          현
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className={cn("text-muted text-c1 font-semibold", head.className)}
            style={head.style}
          >
            현호
          </span>
          <p className={cn(bubble, text.className)} style={text.style}>
            이번 주 저녁 언제 돼? 여기 남겨 줘!
          </p>
          <div
            data-link-card
            className={cn(
              "bg-bg border-ink-900 flex items-center gap-2.5 rounded-md border-[1.5px] py-2.5 pr-3 pl-2.5",
              card.className,
            )}
            style={card.style}
          >
            <Maju expression="default" size={40} />
            <div className="flex flex-col">
              <b className="text-b4 font-bold">현호님의 모임</b>
              <span className="text-muted text-c1">
                되는 시간을 남겨 주세요 · 모여락
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        data-reply
        className={cn("flex items-start gap-2", reply1.className)}
        style={reply1.style}
      >
        <span aria-hidden="true" className={avatar}>
          서
        </span>
        <p className={bubble}>남겼어!</p>
      </div>
      <div
        data-reply
        className={cn("flex items-start gap-2", reply2.className)}
        style={reply2.style}
      >
        <span aria-hidden="true" className={avatar}>
          준
        </span>
        <p className={bubble}>나도 칠했어. 토요일 좋아</p>
      </div>
      <div
        data-result
        className={cn(
          "bg-action text-on-action mt-1 flex items-center gap-2.5 rounded-md px-3.5 py-3",
          result.className,
        )}
        style={result.style}
      >
        <span
          aria-hidden="true"
          className="bg-ink-900 text-b4 grid size-[26px] flex-none place-items-center rounded-full font-extrabold text-white"
        >
          ✓
        </span>
        <div className="flex flex-col">
          <b className="text-b4 font-extrabold">
            11월 8일 (토) 오후 6시 · 녹사평역
          </b>
          <span className="text-c1 font-semibold">
            모두 응답하고 현호님이 확정했어요
          </span>
        </div>
      </div>
    </section>
  );
}
