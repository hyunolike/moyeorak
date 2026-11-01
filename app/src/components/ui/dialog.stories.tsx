import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const meta = { title: "v4/Dialog", component: Dialog } satisfies Meta<
  typeof Dialog
>;
export default meta;

export const Confirm: StoryObj = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button>열기</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이걸로 확정할까요?</DialogTitle>
          <DialogDescription>
            11월 8일 (토) 오후 6시, 녹사평역. 확정하면 모두에게 요약 카드가
            보여요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="primary" size="cta">
            확정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
