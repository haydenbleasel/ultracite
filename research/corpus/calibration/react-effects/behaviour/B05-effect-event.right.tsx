// B05, by hand: the notification is an Effect Event; the connection depends on the room only.
import { useEffect, useEffectEvent } from "react";

export const Subject = ({ roomId, theme, log }: { roomId: string; theme: string; log: (s: string) => void }) => {
  const onConnected = useEffectEvent(() => log(`notify connected (${theme})`));
  useEffect(() => {
    log(`connect ${roomId}`);
    onConnected();
    return () => log(`disconnect ${roomId}`);
  }, [roomId, log]);
  return null;
};
