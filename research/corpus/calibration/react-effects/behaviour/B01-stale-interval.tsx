// B01: a stale closure the rule catches. The interval reads `roomId`, but the effect only runs on
// mount, so after the room changes it keeps pinging the old room.
import { useEffect } from "react";

export const Subject = ({ roomId, log }: { roomId: string; log: (s: string) => void }) => {
  useEffect(() => {
    const id = setInterval(() => log(`ping ${roomId}`), 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{roomId}</p>;
};
