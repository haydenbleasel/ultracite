// B02, by hand: build the options inside the effect and depend on the primitive.
import { useEffect, useState } from "react";

declare const connect: (options: { roomId: string; serverUrl: string }) => () => void;

export const Subject = ({ roomId }: { roomId: string }) => {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const options = { roomId, serverUrl: "https://localhost:1234" };
    const disconnect = connect(options);
    return () => disconnect();
  }, [roomId]);
  return <input value={message} onChange={(e) => setMessage(e.target.value)} />;
};
