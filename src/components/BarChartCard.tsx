"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Series = { key: string; label: string; color: string };

export function BarChartCard({ title, data, series, empty }: { title: string; data: Record<string, string | number>[]; series: Series[]; empty: string }) {
  const hasData = data.some((d) => series.some((s) => Number(d[s.key]) > 0));
  return (
    <section className="card" aria-label={title}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {!hasData ? <p className="muted text-sm">{empty}</p> : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} isAnimationActive />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
