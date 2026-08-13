import { BarChart3, CheckCheck, Clock3, Flame } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { FocusSession, TaskItem } from "../types";

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function ChartTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ value?: number }> }) {
  if (!active || !payload?.length) return null;
  const minutes = payload[0]?.value ?? 0;
  return <div className="chart-tooltip"><strong>{label}</strong><span>{minutes} {minutes === 1 ? "minute" : "minutes"}</span></div>;
}

export function StatsPanel({ sessions, tasks }: { sessions: FocusSession[]; tasks: TaskItem[] }) {
  const now = new Date();
  const today = dayKey(now);
  const chart = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - offset));
    const key = dayKey(date);
    return {
      day: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
      minutes: Math.round(sessions.filter((session) => dayKey(new Date(session.completedAt)) === key && session.phase === "focus").reduce((sum, session) => sum + session.durationSeconds / 60, 0)),
    };
  });
  const todaySessions = sessions.filter((session) => session.phase === "focus" && dayKey(new Date(session.completedAt)) === today);
  const todayMinutes = Math.round(todaySessions.reduce((sum, session) => sum + session.durationSeconds / 60, 0));
  const weeklyMinutes = chart.reduce((sum, item) => sum + item.minutes, 0);
  return (
    <section className="side-card stats-card" aria-labelledby="stats-title" data-tour="insights">
      <div className="section-heading"><div><span className="eyebrow">Rhythm</span><h2 id="stats-title">Focus insights</h2></div><BarChart3 /></div>
      <div className="stats-grid">
        <div><Clock3 /><strong>{todayMinutes}</strong><span>minutes today</span></div>
        <div><Flame /><strong>{todaySessions.length}</strong><span>sessions today</span></div>
        <div><CheckCheck /><strong>{tasks.filter((task) => task.completed).length}</strong><span>tasks complete</span></div>
        <div><BarChart3 /><strong>{weeklyMinutes}</strong><span>minutes this week</span></div>
      </div>
      <div className="chart-wrap" aria-label="Focus minutes over the last seven days">
        <ResponsiveContainer width="100%" height={132}>
          <BarChart data={chart} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--theme-muted)", fontSize: 11, fontWeight: 800 }} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--theme-surface-strong) 38%, transparent)" }} content={<ChartTooltip />} />
            <Bar dataKey="minutes" fill="var(--theme-secondary-deep)" background={{ fill: "var(--theme-surface-strong)", radius: 7 }} minPointSize={4} radius={[7, 7, 3, 3]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
