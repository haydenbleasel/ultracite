import { setupServer } from "msw/node";
import { expect, test, vi } from "vitest";

import { add } from "./math.ts";

vi.mock(import("./math.ts"));

const server = setupServer();

server.listen();

test("adds", { retry: 3 }, async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 100);
  });

  const spy = vi.fn<() => number>(() => 1);

  await vi.waitFor(() => {
    expect(spy).toHaveBeenCalledWith();
  });

  expect(add(1, 2)).toBe(3);
});
