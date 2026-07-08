import { err, ok, retry, type Result } from "./utils";
import type { Task } from "./data";

const BASE_URL = "https://example.com/api";
const DEFAULT_TIMEOUT_MS = 5000;

interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

const withTimeout = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

const request = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<Result<T>> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: options.signal ?? withTimeout(timeoutMs),
    });
    if (!response.ok) {
      return err(`Request to ${path} failed with status ${response.status}`);
    }
    const body = (await response.json()) as T;
    return ok(body);
  } catch (error) {
    return err(`Request to ${path} threw: ${String(error)}`);
  }
};

export const fetchTasks = (): Promise<Result<Task[]>> =>
  retry(() => request<Task[]>("/tasks"), 3);

export const fetchTask = (id: string): Promise<Result<Task>> =>
  request<Task>(`/tasks/${encodeURIComponent(id)}`);

export const createRemoteTask = async (task: Task): Promise<Result<Task>> => {
  try {
    const response = await fetch(`${BASE_URL}/tasks`, {
      body: JSON.stringify(task),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      return err(`Create failed with status ${response.status}`);
    }
    return ok((await response.json()) as Task);
  } catch (error) {
    return err(`Create threw: ${String(error)}`);
  }
};
