"use client";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  reset: () => void;
}

const Error = ({ reset }: ErrorProps) => (
  <div className="grid gap-4 py-32 text-center">
    <h1 className="font-semibold text-4xl tracking-tighter">
      Something went wrong
    </h1>
    <p className="text-muted-foreground text-lg">
      An unexpected error occurred. Please try again.
    </p>
    <div>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  </div>
);

export default Error;
