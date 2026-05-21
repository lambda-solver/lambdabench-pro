import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  viteFinal: async (viteConfig) => {
    // Add Tailwind CSS 4 Vite plugin
    viteConfig.plugins?.push(tailwindcss());
    // Resolve @/ path alias matching app's vite.config.ts
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias ??= {};
    (viteConfig.resolve.alias as Record<string, string>)["@"] = path.resolve(__dirname, "../src");
    return viteConfig;
  },
};

export default config;
