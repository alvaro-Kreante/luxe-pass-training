"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey: string;
  title?: string;
  color?: string;
  height?: number;
}

export function SimpleBarChart({
  data,
  dataKey,
  xAxisKey,
  title,
  color = "#C9A876",
  height = 300,
}: BarChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-ink-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7D9C9" />
          <XAxis dataKey={xAxisKey} stroke="#9C8D80" />
          <YAxis stroke="#9C8D80" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E7D9C9",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#221A14" }}
          />
          <Legend />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
