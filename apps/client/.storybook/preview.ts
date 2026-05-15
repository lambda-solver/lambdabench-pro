import type { Preview } from "@storybook/react";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#fdf6e3",
        },
        {
          name: "dark",
          value: "#002b36",
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const isDark =
        context.globals.backgrounds?.value === "#002b36" ||
        context.parameters.backgrounds?.default === "dark";
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return Story();
    },
  ],
};

export default preview;
