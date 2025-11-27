import type { ComponentProps } from "react";

export const Logo = (props: ComponentProps<"svg">) => (
  <svg
    fill="none"
    viewBox="0 0 420 420"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Ultracite</title>
    <path
      d="M105 315H210L315 210V0H420V250L250 420H0V0H105V315Z"
      fill="currentColor"
    />
    <path d="M420 420H335V335H420V420Z" fill="currentColor" />
  </svg>
);
