import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const meta = { title: "v4/Drawer", component: Drawer } satisfies Meta<
  typeof Drawer
>;
export default meta;

export const Nudge: StoryObj = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerTrigger render={<Button>재촉하기</Button>} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>민지님에게 보낼 메시지</DrawerTitle>
          <DrawerDescription>
            단톡방에 붙여 넣으면 돼요. 끌어내려 닫을 수 있어요.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="primary" size="cta">
            복사하기
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
