// B04: deliberately mount-only. The parent passes a new onReady function on every render, so
// adding the dependencies (the suggested fix) calls it after every parent render.
import { useEffect } from "react";

export const Subject = ({ onReady, value }: { onReady: (v: number) => void; value: number }) => {
  useEffect(() => {
    onReady(value);
  }, []);
  return <p>{value}</p>;
};
