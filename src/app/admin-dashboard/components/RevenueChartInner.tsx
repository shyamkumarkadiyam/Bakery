'use client';
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { day: 'Mon', orders: 18, revenue: 214 },
  { day: 'Tue', orders: 22, revenue: 278 },
  { day: 'Wed', orders: 15, revenue: 189 },
  { day: 'Thu', orders: 28, revenue: 342 },
  { day: 'Fri', orders: 35, revenue: 428 },
  { day: 'Sat', orders: 41, revenue: 512 },
  { day: 'Sun', orders: 23, revenue: 347 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-kawaii px-4 py-3">
        <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-extrabold text-foreground">
          {payload[0].value} orders
        </p>
        <p className="text-xs text-green-text font-bold">
          ${payload[1]?.value ?? 0} revenue
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenueChartInner() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={28} barGap={4}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', radius: 8 }} />
        <Bar dataKey="orders" fill="url(#barGradient)" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.day === 'Sun' ? 'var(--primary)' : 'url(#barGradient)'}
              opacity={entry.day === 'Sun' ? 1 : 0.75}
            />
          ))}
        </Bar>
        <Bar dataKey="revenue" hide />
      </BarChart>
    </ResponsiveContainer>
  );
}