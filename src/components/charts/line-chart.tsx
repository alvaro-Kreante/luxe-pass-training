"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey: string;
  title?: string;
  color?: string;
  height?: number;
}

export function SimpleLineChart({
  data,
  dataKey,
  xAxisKey,
  title,
  color = "#C9A876",
  height = 300,
}: LineChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-ink-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
