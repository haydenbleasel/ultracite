// Behaviour oracle for the React effects subjects (examples/react-effects/). It loads one file (a
// pristine subject, a hand-made variant, a linter's fixed copy or an agent's file) into real React 19
// on the minimal DOM (effects-runtime.cjs), in a fresh Node process, drives the props, events and
// timers that matter, and returns a trace of renders, effect setups and cleanups, the calls the
// subject makes and what it shows after each step. Nothing from a clone runs: subjects are copies
// with their imports stubbed.
//
//   a  hono/jsx's useSyncExternalStore on React's useState and useEffect: a component reads one of two
//      stores (A, then B after a click), in two modes: `stable` (each store's subscribe and getSnapshot
//      are the same functions on every render, as in Hono's own tests) and `inline` (getSnapshot is a
//      new arrow on every render, as callers often write it). Steps: mount, A changes, a re-render, the
//      switch to B, B changes, A changes again, unmount. After each step: the text shown and every
//      subscribe and unsubscribe call so far. Verdict: bug kept (still on A after the switch); partly
//      fixed (subscribed to B, but showing A's value until B changes); bug fixed (shows B's value at
//      once, follows B, ignores A); plus whether it resubscribes on every render in `inline` mode.
//   b  Supabase Studio's TimeInput: a parent holds defaultTime, minimumTime and maximumTime in
//      state, in two modes: `stable` (the same defaultTime object until the parent changes it) and
//      `app` (as PITRForm does it: a new defaultTime object on every parent render, built from the
//      parent's state, which onChange updates). Steps: mount, type in each
//      field, blur (which commits), a parent re-render, minimum and maximum times that make the time
//      invalid, a new defaultTime, more typing. After each step: the three fields' values, the error
//      text, the border class, the onChange calls so far. Verdict: same; typing reverted (a field
//      lost what was just typed); loop; or changed.
//   c  Excalidraw's useTTDChatStorage: two instances (as TextToDiagram and useChatManagement run it)
//      share a recording persistence adapter, in two modes: `stable` (one adapter object) and `fresh`
//      (a new but equal adapter object on every parent render). Steps: mount, a user message, an
//      assistant response that streams and then finishes, typing the next prompt, a parent re-render,
//      a new chat. After each step: loadChats calls, saveChats calls (what each saved), and the saved
//      chats. Verdict: same; saves while typing or streaming; extra loads; a missed save; or changed.
//
// Usage: node effects-oracle.cjs <a|b|c> <file>    (prints { ok, trace } or { ok: false, error })
//        require("./effects-oracle.cjs").runOracle(id, file) -> { ok, trace, error }
//        require("./effects-oracle.cjs").verdict(id, base, trace) -> { verdict, differences }
"use strict";

const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { basename } = require("node:path");

// ── scenarios (child side) ─────────────────────────────────────────────
const snapB = (rt, label, calls) => {
  const inputs = rt.queryAll("input");
  const box = rt.container.querySelector("div");
  const err = rt.query("p");
  const cls = box?.className ?? "";
  return {
    border: /border-red-800/.test(cls)
      ? "error"
      : /border-stronger/.test(cls)
        ? "focused"
        : /border-strong/.test(cls)
          ? "normal"
          : "?",
    error: err ? err.textContent : null,
    fields: inputs.map((i) => i.value),
    label,
    onChange: calls.length,
  };
};
const scenarioB = async (rt, mod, mode) => {
  const TimeInput = mod.default;
  const React = rt.instrumented;
  const calls = [];
  let setState = null;
  const Parent = () => {
    const [s, set] = React.useState({
      defaultTime: { h: 10, m: 20, s: 30 },
      maximumTime: undefined,
      minimumTime: undefined,
      tick: 0,
    });
    setState = set;
    // `app`: like PITRForm, a new defaultTime object on every render, built from the parent's
    // state, which onChange updates
    const defaultTime = mode === "app" ? { ...s.defaultTime } : s.defaultTime;
    return rt.h(TimeInput, {
      defaultTime,
      maximumTime: s.maximumTime,
      minimumTime: s.minimumTime,
      onChange: (t) => {
        calls.push(`${t.h}:${t.m}:${t.s}`);
        if (mode === "app") {
          set((prev) => ({
            ...prev,
            defaultTime: { h: Number(t.h), m: Number(t.m), s: Number(t.s) },
          }));
        }
      },
    });
  };
  const steps = [];
  const field = (i) => rt.queryAll("input")[i];
  const type = (i, value) =>
    rt.act(() => rt.propsOf(field(i)).onChange({ target: { value } }));
  const blur = (i, value) =>
    rt.act(() => rt.propsOf(field(i)).onBlur({ target: { value } }));
  const parent = (patch) => rt.act(() => setState((s) => ({ ...s, ...patch })));
  rt.mount(rt.h(Parent, {}));
  steps.push(snapB(rt, "mount", calls));
  rt.act(() => rt.propsOf(field(0)).onFocus());
  type(0, "1");
  steps.push(snapB(rt, "type H 1", calls));
  type(0, "12");
  steps.push(snapB(rt, "type H 12", calls));
  blur(0, "12");
  steps.push(snapB(rt, "blur H 12", calls));
  parent({ tick: 1 });
  steps.push(snapB(rt, "parent re-render", calls));
  type(1, "5");
  steps.push(snapB(rt, "type M 5", calls));
  blur(1, "5");
  steps.push(snapB(rt, "blur M 5", calls));
  parent({ minimumTime: { h: 13, m: 0, s: 0 } });
  steps.push(snapB(rt, "minimum 13:00:00", calls));
  parent({ maximumTime: { h: 11, m: 0, s: 0 }, minimumTime: undefined });
  steps.push(snapB(rt, "maximum 11:00:00", calls));
  parent({ defaultTime: { h: 8, m: 0, s: 0 } });
  steps.push(snapB(rt, "defaultTime 08:00:00", calls));
  type(2, "4");
  steps.push(snapB(rt, "type S 4", calls));
  rt.unmount();
  return { calls, steps };
};

const scenarioC = async (rt, mod, mode) => {
  const { useTTDChatStorage, getDefaultStore, chatHistoryAtom } = mod;
  const React = rt.instrumented;
  const store = getDefaultStore();
  const loads = [];
  const saves = [];
  const base = {
    loadChats: async () => {
      loads.push(loads.length + 1);
      return [];
    },
    saveChats: async (chats) => {
      saves.push(
        chats
          .map(
            (c) =>
              `${c.title}|${c.messages.length} messages|prompt "${c.currentPrompt}"`
          )
          .join("; ")
      );
    },
  };
  let api = null;
  let setTick = null;
  const Instance = ({ adapter, which }) => {
    const r = useTTDChatStorage({ persistenceAdapter: adapter });
    if (which === 0) {
      api = r;
    }
    return null;
  };
  const Root = () => {
    const [tick, set] = React.useState(0);
    setTick = set;
    const adapter = mode === "fresh" ? { ...base } : base;
    void tick;
    return rt.h(
      React.Fragment,
      null,
      rt.h(Instance, { adapter, which: 0 }),
      rt.h(Instance, { adapter, which: 1 })
    );
  };
  const steps = [];
  const snap = (label) =>
    steps.push({
      label,
      loads: loads.length,
      saved: api
        ? api.savedChats.map((c) => `${c.title}|${c.messages.length}`)
        : null,
      saves: saves.length,
    });
  const history = (patch) =>
    rt.actAsync(async () =>
      store.set(chatHistoryAtom, (h) => ({ ...h, ...patch }))
    );
  const now = new Date(0);
  rt.mount(rt.h(Root, {}));
  await rt.settle();
  snap("mount");
  const user = {
    content: "Draw a login flowchart",
    id: "u1",
    timestamp: now,
    type: "user",
  };
  await history({ messages: [user] });
  await rt.settle();
  snap("user message");
  await history({
    messages: [
      user,
      {
        content: "",
        id: "a1",
        isGenerating: true,
        timestamp: now,
        type: "assistant",
      },
    ],
  });
  await rt.settle();
  snap("response starts");
  for (const content of ["graph", "graph TD", "graph TD; A-->B"]) {
    await history({
      messages: [
        user,
        {
          content,
          id: "a1",
          isGenerating: true,
          timestamp: now,
          type: "assistant",
        },
      ],
    });
    await rt.settle();
  }
  snap("response streams");
  await history({
    messages: [
      user,
      {
        content: "graph TD; A-->B",
        id: "a1",
        isGenerating: false,
        timestamp: now,
        type: "assistant",
      },
    ],
  });
  await rt.settle();
  snap("response finishes");
  for (const p of ["M", "Ma", "Make"]) {
    await history({ currentPrompt: p });
    await rt.settle();
  }
  snap("typing the next prompt");
  await rt.actAsync(async () => setTick(1));
  await rt.settle();
  snap("parent re-render");
  await rt.actAsync(async () => {
    await api.createNewChatId();
  });
  await rt.settle();
  snap("new chat id");
  rt.unmount();
  return { loads: loads.length, saves, steps };
};

const scenarioA = async (rt, mod, mode) => {
  const { useSyncExternalStore } = mod;
  const React = rt.instrumented;
  const events = [];
  const store = (name, initial) => {
    let value = initial;
    const listeners = new Set();
    return {
      emit: (v) => {
        value = v;
        for (const l of [...listeners]) {
          l();
        }
      },
      getSnapshot: () => value,
      subscribe: (cb) => {
        events.push(`subscribe ${name}`);
        listeners.add(cb);
        return () => {
          events.push(`unsubscribe ${name}`);
          listeners.delete(cb);
        };
      },
    };
  };
  const A = store("A", "a1");
  const B = store("B", "b0");
  const stores = [A, B];
  let setIndex = null;
  let setTick = null;
  const App = () => {
    const [index, set] = React.useState(0);
    const [, tick] = React.useState(0);
    setIndex = set;
    setTick = tick;
    const s = stores[index];
    const value = useSyncExternalStore(
      s.subscribe,
      mode === "inline" ? () => s.getSnapshot() : s.getSnapshot
    );
    return rt.h("button", null, String(value));
  };
  const steps = [];
  const snap = (label) =>
    steps.push({ events: events.length, label, text: rt.text() });
  rt.mount(rt.h(App, {}));
  snap("mount");
  rt.act(() => A.emit("a2"));
  snap("A changes to a2");
  rt.act(() => setTick(1));
  rt.act(() => setTick(2));
  snap("two re-renders");
  rt.act(() => setIndex(1));
  snap("switch to B");
  rt.act(() => B.emit("b1"));
  snap("B changes to b1");
  rt.act(() => A.emit("a3"));
  snap("A changes to a3");
  rt.unmount();
  snap("unmount");
  return { events, steps };
};

const runChild = async (id, file) => {
  const rtlib = require("./effects-runtime.cjs");
  // React reports an update loop it detects outside act (from the scheduler) by throwing there; keep
  // it in the trace instead of losing the process.
  const uncaught = [];
  process.on("uncaughtException", (e) =>
    uncaught.push(
      String(e?.message ?? e)
        .split("\n")[0]
        .slice(0, 200)
    )
  );
  const out = {};
  const modes = {
    a: ["stable", "inline"],
    b: ["stable", "app"],
    c: ["stable", "fresh"],
  }[id];
  for (const mode of modes) {
    const rt = rtlib.createRuntime({});
    let mod;
    try {
      mod = rtlib.loadModule(rt, readFileSync(file, "utf8"), basename(file), {
        globals: {
          clearInterval: rt.timers.clearInterval,
          clearTimeout: rt.timers.clearTimeout,
          setInterval: rt.timers.setInterval,
          setTimeout: rt.timers.setTimeout,
        },
      });
    } catch (error) {
      rt.restore();
      return {
        error: `load: ${String(error.message).slice(0, 300)}`,
        ok: false,
      };
    }
    let result;
    try {
      result = await { a: scenarioA, b: scenarioB, c: scenarioC }[id](
        rt,
        mod,
        mode
      );
    } catch (error) {
      result = { scenarioError: String(error.message).slice(0, 300) };
    }
    const count = (xs) =>
      xs.reduce((o, x) => ({ ...o, [x]: (o[x] ?? 0) + 1 }), {});
    out[mode] = {
      ...result,
      cleanups: count(rt.trace.cleanups),
      errors: [
        ...rt.trace.errors,
        ...uncaught.splice(0).map((e) => `uncaught: ${e}`),
      ],
      loop: rt.loop,
      renders: rt.trace.renders,
      setups: count(rt.trace.setups),
      warnings: [
        ...new Set(
          rt.trace.warnings.map((w) => w.split("\n")[0].slice(0, 160))
        ),
      ]
        .filter((w) => !/not wrapped in act/.test(w))
        .slice(0, 5),
    };
    rt.restore();
  }
  return { ok: true, trace: out };
};

if (require.main === module) {
  const [id, file] = process.argv.slice(2);
  runChild(id, file)
    .then((r) => {
      process.stdout.write(`${JSON.stringify(r)}\n`);
      process.exit(0);
    })
    .catch((error) => {
      process.stdout.write(
        `${JSON.stringify({ error: String(error.stack ?? error).slice(0, 500), ok: false })}\n`
      );
      process.exit(0);
    });
}

// ── parent side ────────────────────────────────────────────────────────
const runOracle = (id, file) => {
  const r = spawnSync(process.execPath, [__filename, id, file], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
    timeout: 120_000,
  });
  if (!r.stdout.trim()) {
    return {
      error: `no output (${r.signal ?? r.status}): ${r.stderr.slice(0, 300)}`,
      ok: false,
    };
  }
  return JSON.parse(r.stdout.trim().split("\n").at(-1));
};

const verdict = (id, base, trace) => {
  if (!trace) {
    return { differences: ["no trace"], verdict: "broken" };
  }
  const differences = [];
  let kind = "same";
  for (const mode of Object.keys(base)) {
    const b = base[mode];
    const t = trace[mode];
    if (!t || t.scenarioError) {
      return {
        differences: [`${mode}: ${t?.scenarioError ?? "missing"}`],
        verdict: "broken",
      };
    }
    const crash = t.errors.find(
      (e) =>
        !/Maximum update depth|render cap|effect cap/.test(e) &&
        !b.errors.includes(e)
    );
    if (crash) {
      kind = "crashes";
      differences.push(`${mode}: ${crash}`);
      continue;
    }
    if (
      t.loop ||
      t.errors.some((e) => /Maximum update depth|render cap|effect cap/.test(e))
    ) {
      kind = "loop";
      differences.push(`${mode}: loop ${JSON.stringify(t.loop)}`);
      continue;
    }
    if (id === "a") {
      // judged on its own, against the bug's definition, not only against the original
      const text = (label) => t.steps.find((x) => x.label === label)?.text;
      const subscribedB = t.events.includes("subscribe B");
      const leftA =
        t.events.indexOf("unsubscribe A") !== -1 &&
        t.events.indexOf("unsubscribe A") < t.events.length - 1;
      let a;
      if (
        text("switch to B") === "b0" &&
        text("B changes to b1") === "b1" &&
        text("A changes to a3") === "b1" &&
        subscribedB &&
        leftA
      ) {
        a = "bug fixed";
      } else if (
        subscribedB &&
        text("B changes to b1") === "b1" &&
        text("A changes to a3") === "b1"
      ) {
        a = "partly fixed";
      } else if (
        JSON.stringify(t.steps) === JSON.stringify(b.steps) &&
        JSON.stringify(t.events) === JSON.stringify(b.events)
      ) {
        a = "bug kept";
      } else {
        a = "changed";
      }
      const subs = t.events.filter((e) => e.startsWith("subscribe")).length;
      const baseSubs = b.events.filter((e) => e.startsWith("subscribe")).length;
      differences.push(
        `${mode}: ${a}; ${subs} subscriptions (as written: ${baseSubs}); texts ${t.steps.map((x) => x.text).join(" / ")}`
      );
      if (mode === "stable") {
        kind = a;
      } else if (subs > baseSubs + 1 && kind !== "broken") {
        kind = `${kind}, resubscribes on every render`;
      }
      continue;
    }
    if (id === "b") {
      b.steps.forEach((s, i) => {
        const x = t.steps[i];
        if (JSON.stringify(s) !== JSON.stringify(x)) {
          differences.push(
            `${mode} ${s.label}: ${JSON.stringify(s)} -> ${JSON.stringify(x)}`
          );
          if (
            /^type /.test(s.label) &&
            JSON.stringify(s.fields) !== JSON.stringify(x?.fields) &&
            kind === "same"
          ) {
            kind = "typing reverted";
          } else if (kind === "same") {
            kind = "changed";
          }
        }
      });
      if (JSON.stringify(b.calls) !== JSON.stringify(t.calls)) {
        differences.push(
          `${mode} onChange: ${JSON.stringify(b.calls)} -> ${JSON.stringify(t.calls)}`
        );
        if (kind === "same") {
          kind = "changed";
        }
      }
    }
    if (id === "c") {
      b.steps.forEach((s, i) => {
        const x = t.steps[i];
        if (JSON.stringify(s) !== JSON.stringify(x)) {
          differences.push(
            `${mode} ${s.label}: ${JSON.stringify(s)} -> ${JSON.stringify(x)}`
          );
          const extraSaves = (x?.saves ?? 0) - s.saves;
          const priorExtra =
            i > 0 ? (t.steps[i - 1]?.saves ?? 0) - b.steps[i - 1].saves : 0;
          if (x && x.loads > s.loads && kind === "same") {
            kind = "extra loads";
          } else if (
            extraSaves > priorExtra &&
            /typing|streams/.test(s.label)
          ) {
            kind = "saves while typing or streaming";
          } else if (extraSaves < priorExtra && kind === "same") {
            kind = "missed save";
          } else if (kind === "same") {
            kind = "changed";
          }
        }
      });
    }
  }
  return { differences: differences.slice(0, 20), verdict: kind };
};

module.exports = { runOracle, verdict };
