import { createTask, type Priority, type Task } from "./data";

type Listener = (tasks: readonly Task[]) => void;

export class TaskStore {
  private tasks: Task[] = [];

  private readonly listeners = new Set<Listener>();

  getAll(): readonly Task[] {
    return this.tasks;
  }

  add(title: string, priority: Priority = "medium"): Task {
    const task = createTask({
      id: `task-${this.tasks.length + 1}`,
      priority,
      title,
    });
    this.tasks = [...this.tasks, task];
    this.emit();
    return task;
  }

  toggle(id: string): void {
    this.tasks = this.tasks.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task
    );
    this.emit();
  }

  remove(id: string): void {
    this.tasks = this.tasks.filter((task) => task.id !== id);
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.tasks);
    }
  }
}
