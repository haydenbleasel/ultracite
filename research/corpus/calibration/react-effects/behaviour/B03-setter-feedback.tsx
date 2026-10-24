// B03: the effect sets the state it reads. Adding that state as a dependency (the suggested fix)
// makes a new array on every run, so the effect never settles.
import { useEffect, useState } from "react";

export const Subject = ({ items }: { items: string[] }) => {
  const [visible, setVisible] = useState(items);
  useEffect(() => {
    setVisible(visible.filter((i) => i.length > 0));
  }, []);
  return <p>{visible.join(",")}</p>;
};
