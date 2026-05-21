import "../src/index.css";
import type { Preview } from "@storybook/react";

const VIEWPORTS = {
  desktop: {
    name: "Desktop",
    styles: {
      height: "720px",
      width: "1280px",
    },
    type: "desktop" as const,
  },
  mobile: {
    name: "Mobile",
    styles: {
      height: "667px",
      width: "375px",
    },
    type: "mobile" as const,
  },
  tablet: {
    name: "Tablet",
    styles: {
      height: "1024px",
      width: "768px",
    },
    type: "tablet" as const,
  },
  wide: {
    name: "Wide Desktop",
    styles: {
      height: "1080px",
      width: "1920px",
    },
    type: "desktop" as const,
  },
};

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const isDark =
        context.globals.backgrounds?.value === "#002b36" || context.parameters.backgrounds?.default === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      return Story();
    },
  ],
  parameters: {
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
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    viewport: {
      defaultViewport: "desktop",
      viewports: VIEWPORTS,
    },
  },
};

export default preview;
