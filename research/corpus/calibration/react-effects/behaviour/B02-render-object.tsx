// B02: the missing dependency is an object built during render and passed whole to connect().
// Adding it (the suggested fix) reconnects on every keystroke; as written, the effect also misses
// room changes.
import { useEffect, useState } from "react";

declare const connect: (options: { roomId: string; serverUrl: string }) => () => void;

export const Subject = ({ roomId }: { roomId: string }) => {
  const [message, setMessage] = useState("");
  const options = { roomId, serverUrl: "https://localhost:1234" };
  useEffect(() => {
    const disconnect = connect(options);
    return () => disconnect();
  }, []);
  return <input value={message} onChange={(e) => setMessage(e.target.value)} />;
};
