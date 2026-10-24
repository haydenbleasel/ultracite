// B10: react.dev's counter. setCount(count + 1) in an interval that runs once reads count = 0
// forever.
import { useEffect, useState } from "react";

export const Subject = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <h1>{count}</h1>;
};
