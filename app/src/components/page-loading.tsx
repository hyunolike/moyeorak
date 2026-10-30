import { MobileLayout } from "@/components/mobile-layout";

export function PageLoading({
  message = "불러오는 중이에요",
}: {
  message?: string;
}) {
  return (
    <MobileLayout>
      <p className="text-b4 text-k-500 py-20 text-center">{message}</p>
    </MobileLayout>
  );
}
