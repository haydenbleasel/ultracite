"use client";

import { fonts } from "@/lib/fonts";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalError = ({ error, reset }: GlobalErrorProps) => (
  <html lang="en">
    <body className={fonts}>
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <button onClick={reset} type="button">
          Try again
        </button>
      </div>
    </body>
  </html>
);

export default GlobalError;
