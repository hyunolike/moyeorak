import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";

const meta = { title: "v4/Button", component: Button } satisfies Meta<
  typeof Button
>;
export default meta;

export const Variants: StoryObj = {
  render: () => (
    <div className="flex w-[343px] flex-col gap-3">
      <Button variant="primary" size="cta">
        이걸로 확정
      </Button>
      <Button variant="secondary" size="lg">
        다른 제안 보기
      </Button>
      <Button variant="ghost">모임 홈으로 가기</Button>
      <Button variant="danger">출발지 삭제</Button>
      <Button variant="primary" size="cta" disabled>
        응답을 기다리는 중
      </Button>
    </div>
  ),
};
