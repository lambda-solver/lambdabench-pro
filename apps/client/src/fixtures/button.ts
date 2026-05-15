import type { ButtonFixture } from "./index";

export const buttonFixtures: readonly ButtonFixture[] = [
  {
    name: "default",
    variant: "default",
    label: "Button",
  },
  {
    name: "outline",
    variant: "outline",
    label: "Outline",
  },
  {
    name: "secondary",
    variant: "secondary",
    label: "Secondary",
  },
  {
    name: "ghost",
    variant: "ghost",
    label: "Ghost",
  },
  {
    name: "destructive",
    variant: "destructive",
    label: "Destructive",
  },
  {
    name: "link",
    variant: "link",
    label: "Link",
  },
  {
    name: "small",
    variant: "default",
    size: "sm",
    label: "Small",
  },
  {
    name: "large",
    variant: "default",
    size: "lg",
    label: "Large",
  },
  {
    name: "disabled",
    variant: "default",
    disabled: true,
    label: "Disabled",
  },
  {
    name: "icon-button",
    variant: "default",
    size: "icon",
    label: "+",
  },
];
