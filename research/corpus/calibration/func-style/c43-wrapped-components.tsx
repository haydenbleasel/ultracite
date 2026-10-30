// C43: components wrapped in React's memo and forwardRef, imported from react (lint only; Node
// can't import react here).
import { forwardRef, memo } from "react";

export const Memoized = memo(({ id }: { id: number }) => <i>{id}</i>);

export const WithRef = forwardRef<HTMLSpanElement, { label: string }>(({ label }, ref) => (
  <span ref={ref}>{label}</span>
));
