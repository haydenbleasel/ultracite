import type * as React from "react";

import { Button } from "./button";

// Inside the UI directory: restyling a sibling component, an arbitrary
// structural value, and a dynamic class value are all allowed by the
// preset's component-directory override.
export function CardAction({
  extra,
  ...props
}: React.ComponentProps<"button"> & { extra: string }) {
  return (
    <div className="ring-[3px]">
      <Button className={`rounded-full p-4 ${extra}`} {...props} />
    </div>
  );
}
