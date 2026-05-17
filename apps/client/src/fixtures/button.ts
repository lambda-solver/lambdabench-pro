import type { ButtonFixture } from "./index";

export const buttonFixtures: ReadonlyArray<ButtonFixture> = [
  {
    label: "Button",
    name: "default",
    variant: "default",
  },
  {
    label: "Outline",
    name: "outline",
    variant: "outline",
  },
  {
    label: "Secondary",
    name: "secondary",
    variant: "secondary",
  },
  {
    label: "Ghost",
    name: "ghost",
    variant: "ghost",
  },
  {
    label: "Destructive",
    name: "destructive",
    variant: "destructive",
  },
  {
    label: "Link",
    name: "link",
    variant: "link",
  },
  {
    label: "Small",
    name: "small",
    size: "sm",
    variant: "default",
  },
  {
    label: "Large",
    name: "large",
    size: "lg",
    variant: "default",
  },
  {
    disabled: true,
    label: "Disabled",
    name: "disabled",
    variant: "default",
  },
  {
    label: "+",
    name: "icon-button",
    size: "icon",
    variant: "default",
  },
];
