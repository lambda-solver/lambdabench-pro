import type { Preview } from "@storybook/react";
import "../src/index.css";

const VIEWPORTS = {
  mobile: {
    name: "Mobile",
    styles: {
      width: "375px",
      height: "667px",
    },
    type: "mobile" as const,
  },
  tablet: {
    name: "Tablet",
    styles: {
      width: "768px",
      height: "1024px",
    },
    type: "tablet" as const,
  },
  desktop: {
    name: "Desktop",
    styles: {
      width: "1280px",
      height: "720px",
    },
    type: "desktop" as const,
  },
  wide: {
    name: "Wide Desktop",
    styles: {
      width: "1920px",
      height: "1080px",
    },
    type: "desktop" as const,
  },
};

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
    viewport: {
      viewports: VIEWPORTS,
      defaultViewport: "desktop",
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
