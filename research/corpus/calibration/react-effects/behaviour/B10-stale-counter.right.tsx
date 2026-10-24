// B10, by hand: an updater function, so the effect doesn't need count and the interval runs once.
import { useEffect, useState } from "react";

export const Subject = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <h1>{count}</h1>;
};
