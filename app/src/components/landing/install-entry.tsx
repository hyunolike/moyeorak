"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { detectInstallMode, type InstallMode } from "@/lib/install-mode";

/** 크롬 계열이 설치 창을 띄울 수 있을 때 보내는 이벤트. 표준 타입에 아직 없다. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * 홈 화면 추가 방법을 고른다. 서버 렌더와 첫 렌더에서는 null이라 아무것도 그리지 않고,
 * 마운트 뒤 브라우저를 보고 정한다. 설치 창 이벤트는 기본 미니 바를 막고 붙잡아 둔다.
 */
function useInstallMode() {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const decide = (canPrompt: boolean) =>
      setMode(
        detectInstallMode({
          userAgent: navigator.userAgent,
          standalone: isStandalone(),
          canPrompt,
        }),
      );
    decide(false);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      decide(true);
    };
    const onInstalled = () => {
      setDeferred(null);
      setMode("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // 한 번 쓴 이벤트는 다시 띄울 수 없다. 거절하면 브라우저가 새 이벤트를 줄 때까지 숨긴다.
    setDeferred(null);
    setMode(outcome === "accepted" ? "installed" : "unsupported");
  }

  return { mode, promptInstall };
}

/**
 * 첫 화면의 "홈 화면에 추가" 줄. 추가할 방법이 있는 브라우저에서만 보인다.
 * 안드로이드 크롬은 브라우저 설치 창을 띄우고, 아이폰과 앱 안 브라우저는 방법을 시트로 알려 준다.
 */
export function InstallEntry() {
  const { mode, promptInstall } = useInstallMode();
  const [guideOpen, setGuideOpen] = useState(false);

  if (mode !== "prompt" && mode !== "ios" && mode !== "in-app") return null;

  return (
    <>
      <div className="border-ink-200 mt-8 flex items-center gap-3 rounded-md border px-4 py-3.5">
        {/* biome-ignore lint/performance/noImgElement: 32px 정적 아이콘이라 next/image가 필요 없다 */}
        <img
          src="/brand/icons/icon-192.png"
          alt=""
          width={36}
          height={36}
          className="size-9 flex-none"
        />
        <div className="min-w-0 flex-1">
          <p className="text-text text-b3 font-semibold">자주 쓴다면</p>
          <p className="text-muted text-c1">앱처럼 바로 열 수 있어요</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (mode === "prompt") void promptInstall();
            else setGuideOpen(true);
          }}
        >
          홈 화면에 추가
        </Button>
      </div>
      {guideOpen && (
        <InstallGuide
          inApp={mode === "in-app"}
          onClose={() => setGuideOpen(false)}
        />
      )}
    </>
  );
}

function InstallGuide({
  inApp,
  onClose,
}: {
  inApp: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      showSwipeHandle
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="gap-3.5 px-5 pt-2 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-h2 text-text">
            {inApp ? "다른 브라우저로 열어 주세요" : "홈 화면에 추가하기"}
          </DrawerTitle>
          {inApp ? (
            <p className="text-text text-b2 break-keep">
              카카오톡 같은 앱 안에서는 홈 화면에 추가할 수 없어요. 화면 구석의
              ⋯ 메뉴에서 &lsquo;다른 브라우저로 열기&rsquo;를 누른 뒤, 거기서
              다시 &lsquo;홈 화면에 추가&rsquo;를 눌러 주세요.
            </p>
          ) : (
            <ol className="text-text text-b2 flex list-none flex-col gap-3 break-keep">
              <li className="flex gap-2.5">
                <Step n={1} />
                <span>
                  사파리 아래쪽의 공유 버튼
                  <IosShareGlyph />을 눌러요. 보이지 않으면 ⋯ 버튼을 먼저
                  눌러요.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Step n={2} />
                <span>목록에서 &lsquo;홈 화면에 추가&rsquo;를 골라요.</span>
              </li>
              <li className="flex gap-2.5">
                <Step n={3} />
                <span>
                  오른쪽 위 &lsquo;추가&rsquo;를 누르면 홈 화면에 모여락이
                  생겨요.
                </span>
              </li>
            </ol>
          )}
        </DrawerHeader>
        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button type="button" size="cta" onClick={onClose}>
            확인
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="bg-surface-sunken text-text text-c1 grid size-6 flex-none place-items-center rounded-full font-bold tabular-nums"
    >
      {n}
    </span>
  );
}

/** 사파리 공유 버튼 모양(네모 위로 나가는 화살표). 앱 공유 아이콘과 달라 따로 그린다. */
function IosShareGlyph() {
  return (
    <svg
      role="img"
      aria-label="공유"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-0.5 inline size-4 align-[-2px]"
    >
      <path d="M8 9 H6 V21 H18 V9 H16" />
      <path d="M12 3 V14 M8.5 6.5 L12 3 L15.5 6.5" />
    </svg>
  );
}
