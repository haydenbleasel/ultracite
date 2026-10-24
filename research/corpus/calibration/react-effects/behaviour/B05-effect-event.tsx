// B05: react.dev's chat room. The notification reads the theme, which isn't a dependency. Adding
// it (the suggested fix) reconnects whenever the theme changes.
import { useEffect } from "react";

export const Subject = ({ roomId, theme, log }: { roomId: string; theme: string; log: (s: string) => void }) => {
  useEffect(() => {
    log(`connect ${roomId}`);
    log(`notify connected (${theme})`);
    return () => log(`disconnect ${roomId}`);
  }, [roomId]);
  return null;
};
