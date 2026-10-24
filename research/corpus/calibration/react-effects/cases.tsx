// Calibration cases for the React hook dependency rules. Each case is one component or hook,
// introduced by a `// Cnn: …` line; effects-calibration.cjs attributes every diagnostic to the
// case whose lines contain it, runs each linter's fix passes on a copy, and records what each
// case's dependency array became. The runnable behaviour cases are in behaviour/.
import {
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useEffect as usePreactEffect } from "preact/hooks";
import { useEffectEvent as usePolyfillEffectEvent } from "@radix-ui/react-use-effect-event";
import { ThemeContext, formatName, useForm, useMyEffect, useQuery } from "./helpers";

declare const log: (...args: unknown[]) => void;
const MODULE_CONST = 42;
let moduleLet = 0;

// C01: missing primitive derived during render
export const C01 = ({ count }: { count: number }) => {
  const doubled = count * 2;
  useEffect(() => {
    log(doubled);
  }, []);
  return null;
};

// C02: missing prop
export const C02 = ({ roomId }: { roomId: string }) => {
  useEffect(() => {
    log(roomId);
  }, []);
  return null;
};

// C03: missing state
export const C03 = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    log(value);
  }, []);
  return <button onClick={() => setValue(value + 1)}>{value}</button>;
};

// C04: missing function declared during render that captures a prop
export const C04 = ({ roomId }: { roomId: string }) => {
  const connect = () => log("connect", roomId);
  useEffect(() => {
    connect();
  }, []);
  return null;
};

// C05: missing function declared during render that captures nothing reactive
export const C05 = () => {
  const format = (s: string) => s.trim();
  useEffect(() => {
    log(format(" x "));
  }, []);
  return null;
};

// C06: missing object built during render
export const C06 = ({ roomId }: { roomId: string }) => {
  const options = { roomId, serverUrl: "https://localhost:1234" };
  useEffect(() => {
    log(options.roomId);
  }, []);
  return null;
};

// C07: an object built during render listed as a dependency
export const C07 = ({ roomId }: { roomId: string }) => {
  const options = { roomId };
  useEffect(() => {
    log(options.roomId);
  }, [options]);
  return null;
};

// C08: a function built during render listed as a dependency
export const C08 = ({ roomId }: { roomId: string }) => {
  const connect = () => log("connect", roomId);
  useEffect(() => {
    connect();
  }, [connect]);
  return null;
};

// C09: state setter, reducer dispatch and a ref omitted (all stable)
export const C09 = () => {
  const [, setValue] = useState(0);
  const [, dispatch] = useReducer((s: number) => s + 1, 0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setValue(1);
    dispatch();
    log(ref.current);
  }, []);
  return <div ref={ref} />;
};

// C10: ref.current read in the cleanup
export const C10 = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    return () => log(ref.current);
  }, []);
  return <div ref={ref} />;
};

// C11: a useEffectEvent function omitted (right), and listed (wrong)
export const C11 = ({ theme, roomId }: { theme: string; roomId: string }) => {
  const onConnected = useEffectEvent(() => log("connected", theme));
  useEffect(() => {
    log(roomId);
    onConnected();
  }, [roomId]);
  useEffect(() => {
    onConnected();
  }, [onConnected]);
  return null;
};

// C12: a custom effect hook (no rule configuration names it)
export const C12 = ({ roomId }: { roomId: string }) => {
  useMyEffect(() => {
    log(roomId);
  }, []);
  return null;
};

// C13: an async effect callback
export const C13 = ({ id }: { id: string }) => {
  const [data, setData] = useState<unknown>(null);
  useEffect(async () => {
    const res = await fetch(`/api/${id}`);
    setData(await res.json());
  }, [id]);
  return <pre>{String(data)}</pre>;
};

// C14: an unnecessary dependency in an effect (listed, never read)
export const C14 = ({ refreshKey, id }: { refreshKey: number; id: string }) => {
  useEffect(() => {
    log("refetch", id);
  }, [id, refreshKey]);
  return null;
};

// C15: an unnecessary dependency in useCallback and useMemo
export const C15 = ({ a, b }: { a: number; b: number }) => {
  const f = useCallback(() => log(a), [a, b]);
  const v = useMemo(() => a * 2, [a, b]);
  return <button onClick={f}>{v}</button>;
};

// C16: an outer-scope value and a module `let` listed
export const C16 = () => {
  useEffect(() => {
    log(MODULE_CONST, moduleLet);
  }, [MODULE_CONST, moduleLet]);
  return null;
};

// C17: an import listed
export const C17 = () => {
  useEffect(() => {
    log(formatName("x"));
  }, [formatName]);
  return null;
};

// C18: optional chaining, used and missing
export const C18 = ({ user }: { user?: { id: string } }) => {
  useEffect(() => {
    log(user?.id);
  }, []);
  return null;
};

// C19: optional chaining, listed as written
export const C19 = ({ user }: { user?: { id: string } }) => {
  useEffect(() => {
    log(user?.id);
  }, [user?.id]);
  return null;
};

// C20: useCallback missing a dependency
export const C20 = ({ onSave, id }: { onSave: (id: string) => void; id: string }) => {
  const save = useCallback(() => onSave(id), [onSave]);
  return <button onClick={save}>Save</button>;
};

// C21: useMemo missing a dependency
export const C21 = ({ items, filter }: { items: string[]; filter: string }) => {
  const visible = useMemo(() => items.filter((i) => i.includes(filter)), [items]);
  return <p>{visible.length}</p>;
};

// C22: an effect with no dependency array that sets state
export const C22 = () => {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(n + 1);
  });
  return <p>{n}</p>;
};

// C23: an effect with no dependency array that doesn't set state
export const C23 = ({ title }: { title: string }) => {
  useEffect(() => {
    document.title = title;
  });
  return null;
};

// C24: a dependency array that isn't an array literal
export const C24 = ({ a }: { a: number }) => {
  const deps = [a];
  useEffect(() => {
    log(a);
  }, deps);
  return null;
};

// C25: useLayoutEffect missing a dependency
export const C25 = ({ width }: { width: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${width}px`;
    }
  }, []);
  return <div ref={ref} />;
};

// C26: useInsertionEffect missing a dependency
export const C26 = ({ color }: { color: string }) => {
  useInsertionEffect(() => {
    log("insert rule", color);
  }, []);
  return null;
};

// C27: a hook called in a condition
export const C27 = ({ enabled }: { enabled: boolean }) => {
  if (enabled) {
    useEffect(() => {
      log("on");
    }, []);
  }
  return null;
};

// C28: derived state set in an effect
export const C28 = ({ first, last }: { first: string; last: string }) => {
  const [fullName, setFullName] = useState("");
  useEffect(() => {
    setFullName(`${first} ${last}`);
  }, [first, last]);
  return <p>{fullName}</p>;
};

// C29: an effect chain (one effect's state feeds the next)
export const C29 = ({ card }: { card: { gold: boolean } | null }) => {
  const [goldCount, setGoldCount] = useState(0);
  const [round, setRound] = useState(1);
  useEffect(() => {
    if (card?.gold) {
      setGoldCount((c) => c + 1);
    }
  }, [card]);
  useEffect(() => {
    if (goldCount > 3) {
      setRound((r) => r + 1);
      setGoldCount(0);
    }
  }, [goldCount]);
  return <p>{round}</p>;
};

// C30: a useEffectEvent from another module (Radix's polyfill is named the same)
export const C30 = ({ onChange }: { onChange: (v: boolean) => void }) => {
  const emit = usePolyfillEffectEvent(onChange);
  useEffect(() => {
    emit(true);
  }, []);
  return null;
};

// C31: an effect hook imported from another module (Preact)
export const C31 = ({ roomId }: { roomId: string }) => {
  usePreactEffect(() => {
    log(roomId);
  }, []);
  return null;
};

// C32: a member path read, the object listed
export const C32 = ({ config }: { config: { a: { b: number } } }) => {
  useEffect(() => {
    log(config.a.b);
  }, [config.a]);
  return null;
};

// C33: a method called on a custom hook's value, the value listed
export const C33 = ({ data }: { data: { name: string } }) => {
  const form = useForm();
  useEffect(() => {
    form.reset(data);
  }, [data, form]);
  return null;
};

// C34: a method called on a custom hook's value, nothing listed
export const C34 = ({ data }: { data: { name: string } }) => {
  const form = useForm();
  useEffect(() => {
    form.reset(data);
  }, [data]);
  return null;
};

// C35: a literal, a complex expression and a duplicate in the array
export const C35 = ({ a, items }: { a: number; items: number[] }) => {
  useEffect(() => {
    log(a, items.length);
  }, [a, a, 1, items.length > 0]);
  return null;
};

// C36: the dependency rule suppressed above the useEffect line (where neither ESLint nor Oxlint
// reports it), with a setState-in-effect elsewhere in the component
export const C36 = ({ roomId, onReady }: { roomId: string; onReady: () => void }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(n + 1);
  }, [n]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onReady();
    log(roomId);
  }, []);
  return <p>{n}</p>;
};

// C37: a setter-like prop omitted
export const C37 = ({ setOpen, open }: { setOpen: (v: boolean) => void; open: boolean }) => {
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
  }, [open]);
  return null;
};

// C38: const literals declared during render (string, boolean)
export const C38 = () => {
  const label = "x";
  const flag = true;
  useEffect(() => {
    log(label, flag);
  }, []);
  return null;
};

// C39: notifying the parent from an effect
export const C39 = ({ onChange }: { onChange: (v: boolean) => void }) => {
  const [isOn, setIsOn] = useState(false);
  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);
  return <button onClick={() => setIsOn(!isOn)}>toggle</button>;
};

// C40: fetching in an effect without ignoring stale responses
export const C40 = ({ query }: { query: string }) => {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/search?q=${query}`)
      .then((r) => r.json())
      .then((json) => setResults(json));
  }, [query]);
  return <p>{results.length}</p>;
};

// C41: useImperativeHandle missing a dependency
export const C41 = ({ value, ref }: { value: string; ref: React.Ref<{ get: () => string }> }) => {
  useImperativeHandle(ref, () => ({ get: () => value }), []);
  return null;
};

// C42: a spread in the dependency array
export const C42 = ({ a, rest }: { a: number; rest: number[] }) => {
  useEffect(() => {
    log(a, rest);
  }, [a, ...rest]);
  return null;
};

// C43: resetting state when a prop changes
export const C43 = ({ userId }: { userId: string }) => {
  const [comment, setComment] = useState("");
  useEffect(() => {
    setComment("");
  }, [userId]);
  return <textarea value={comment} onChange={(e) => setComment(e.target.value)} />;
};

// C44: props called through the props object
export function C44(props: { onOpen: () => void; open: boolean }) {
  useEffect(() => {
    if (props.open) {
      props.onOpen();
    }
  }, [props.open]);
  return null;
}

// C45: a custom hook's result and a context value omitted
export const C45 = () => {
  const { data } = useQuery();
  const theme = useContext(ThemeContext);
  useEffect(() => {
    log(data, theme);
  }, []);
  return null;
};

// C46: a ref's .current listed as a dependency
export const C46 = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log(ref.current);
  }, [ref.current]);
  return <div ref={ref} />;
};

// C47: an effect that writes to a variable declared in render
export const C47 = ({ a }: { a: number }) => {
  let latest = 0;
  useEffect(() => {
    latest = a;
  }, [a]);
  return <p>{latest}</p>;
};

// C48: a custom hook (useX) whose own effect is missing a dependency of its argument
export const useInterval = (callback: () => void, delay: number) => {
  useEffect(() => {
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [delay]);
};

// C49: a stable function defined in render that reads only a ref (ESLint/Oxlint: no captured
// reactive values)
export const C49 = () => {
  const ref = useRef(0);
  const read = () => ref.current;
  useEffect(() => {
    log(read());
  }, []);
  return null;
};

// C50: an effect whose callback is a named function declared in render
export const C50 = ({ a }: { a: number }) => {
  function effect() {
    log(a);
  }
  useEffect(effect, []);
  return null;
};

// C51: the dependency rule suppressed where ESLint reports it (the line above the array), with a
// setState-in-effect elsewhere in the component
export const C51 = ({ roomId, onReady }: { roomId: string; onReady: () => void }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(n + 1);
  }, [n]);
  useEffect(() => {
    onReady();
    log(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <p>{n}</p>;
};

// C52: optional chains listed as trigger dependencies the body doesn't read
export const C52 = ({ save }: { save: () => void }) => {
  const [history] = useState<{ messages?: { id: string; generating?: boolean }[] }>({});
  const last = history.messages?.[history.messages.length - 1];
  useEffect(() => {
    if (!last?.generating) {
      save();
    }
  }, [history.messages?.length, last?.id, last?.generating]);
  return null;
};

// C53: the effect calls a function declared after it (fine at run time; listing it reads it during
// render, before its declaration)
export const C53 = ({ min }: { min: number }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    check(value);
  }, [value]);
  const check = (v: number) => {
    if (v < min) {
      setValue(min);
    }
  };
  return <p>{value}</p>;
};
