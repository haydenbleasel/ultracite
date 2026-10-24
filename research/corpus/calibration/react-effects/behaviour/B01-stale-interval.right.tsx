// B01, by hand: depend on roomId, so the interval restarts for the new room.
import { useEffect } from "react";

export const Subject = ({ roomId, log }: { roomId: string; log: (s: string) => void }) => {
  useEffect(() => {
    const id = setInterval(() => log(`ping ${roomId}`), 1000);
    return () => clearInterval(id);
  }, [roomId, log]);
  return <p>{roomId}</p>;
};
