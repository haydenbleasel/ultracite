import { useCallback, useMemo, useState } from "react";

import { openTasks, sortByPriority, summarize, type Task } from "./data";

interface TaskListProps {
  readonly tasks: readonly Task[];
  readonly onToggle: (id: string) => void;
}

const priorityLabel: Record<Task["priority"], string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
};

export const TaskList = ({ tasks, onToggle }: TaskListProps) => {
  const [showDone, setShowDone] = useState(false);

  const visible = useMemo(() => {
    const source = showDone ? tasks : openTasks(tasks);
    return sortByPriority(source);
  }, [tasks, showDone]);

  const handleToggleShowDone = useCallback(() => {
    setShowDone((previous) => !previous);
  }, []);

  return (
    <section aria-label="Task list">
      <header>
        <p>{summarize(tasks)}</p>
        <button onClick={handleToggleShowDone} type="button">
          {showDone ? "Hide done" : "Show done"}
        </button>
      </header>
      <ul>
        {visible.map((task) => (
          <li key={task.id}>
            <label>
              <input
                checked={task.done}
                onChange={() => onToggle(task.id)}
                type="checkbox"
              />
              <span>{task.title}</span>
              <small>{priorityLabel[task.priority]}</small>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};
