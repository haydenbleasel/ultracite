// B04, by hand: keep it mount-only and satisfy the rule with an Effect Event.
import { useEffect, useEffectEvent } from "react";

export const Subject = ({ onReady, value }: { onReady: (v: number) => void; value: number }) => {
  const ready = useEffectEvent(() => onReady(value));
  useEffect(() => {
    ready();
  }, []);
  return <p>{value}</p>;
};
