import { Check, Circle, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TaskItem } from "../types";

interface Props {
  tasks: TaskItem[];
  activeTaskId: string | null;
  onSelect: (id: string) => void;
  onAdd: (title: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<TaskItem, "title" | "completed">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskPanel({ tasks, activeTaskId, onSelect, onAdd, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onAdd(title);
    setTitle("");
  };
  return (
    <section className="side-card task-card" aria-labelledby="tasks-title">
      <div className="section-heading"><div><span className="eyebrow">Today</span><h2 id="tasks-title">Your tasks</h2></div><span className="count-badge">{tasks.filter((task) => !task.completed).length}</span></div>
      <form className="inline-form" onSubmit={submit}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add something worth finishing" maxLength={240} aria-label="New task title" />
        <button className="small-primary" aria-label="Add task"><Plus /></button>
      </form>
      <div className="task-list">
        {tasks.length === 0 && <div className="task-empty empty-state">
          <ListTodo />
          <strong>No tasks yet</strong>
          <span>Add your first task above to start a focused session.</span>
        </div>}
        {tasks.map((task) => (
          <div className={`task-row ${task.completed ? "done" : ""} ${activeTaskId === task.id ? "active" : ""}`} key={task.id}>
            <button className="task-check" onClick={() => void onUpdate(task.id, { completed: !task.completed })} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>
              {task.completed ? <Check /> : <Circle />}
            </button>
            {editingId === task.id ? (
              <form className="edit-task" onSubmit={(event) => { event.preventDefault(); void onUpdate(task.id, { title: editingTitle }); setEditingId(null); }}>
                <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={240} />
              </form>
            ) : (
              <button className="task-title" onClick={() => !task.completed && onSelect(task.id)}>{task.title}</button>
            )}
            <div className="row-actions">
              <button onClick={() => { setEditingId(task.id); setEditingTitle(task.title); }} aria-label={`Edit ${task.title}`}><Pencil /></button>
              <button onClick={() => void onDelete(task.id)} aria-label={`Delete ${task.title}`}><Trash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
