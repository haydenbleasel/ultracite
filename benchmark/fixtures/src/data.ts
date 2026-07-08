import { groupBy, uniqueBy } from "./utils";

export type Priority = "low" | "medium" | "high";

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly priority: Priority;
  readonly done: boolean;
  readonly tags: readonly string[];
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  low: 1,
  medium: 2,
};

export const sortByPriority = (tasks: readonly Task[]): Task[] =>
  [...tasks].sort(
    (left, right) =>
      PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority]
  );

export const openTasks = (tasks: readonly Task[]): Task[] =>
  tasks.filter((task) => !task.done);

export const tasksByPriority = (tasks: readonly Task[]): Record<Priority, Task[]> =>
  groupBy(tasks, (task) => task.priority);

export const allTags = (tasks: readonly Task[]): string[] =>
  uniqueBy(
    tasks.flatMap((task) => task.tags),
    (tag) => tag
  );

export const summarize = (tasks: readonly Task[]): string => {
  const open = openTasks(tasks).length;
  const total = tasks.length;
  const label = total === 1 ? "task" : "tasks";
  return `${open} of ${total} ${label} remaining`;
};

export const createTask = (partial: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
  done: false,
  priority: "medium",
  tags: [],
  ...partial,
});
