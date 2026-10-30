import type { Preview } from "@storybook/react-vite";
import "@/app/globals.css";

document.documentElement.dataset.theme = "light";

const preview: Preview = {
  parameters: { layout: "centered" },
};

export default preview;
