import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = { title: "v4/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;

export const Schedule: StoryObj = {
  render: () => (
    <Tabs defaultValue="vote" className="w-[343px]">
      <TabsList>
        <TabsTrigger value="vote">시간 고르기</TabsTrigger>
        <TabsTrigger value="best">최적일정</TabsTrigger>
      </TabsList>
      <TabsContent value="vote" className="text-b4 text-muted pt-4">
        가능한 시간을 쓸어내려 칠해 주세요.
      </TabsContent>
      <TabsContent value="best" className="text-b4 text-muted pt-4">
        4명이 되는 시간이 1순위예요.
      </TabsContent>
    </Tabs>
  ),
};
