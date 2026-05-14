'use client'

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

const BAR_COLOR = 'hsl(var(--accent))'

interface BarChartProps {
  data: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
  height?: number
}

export function BarChart({ data, valueFormatter, height = 250 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => valueFormatter?.(Number(v)) ?? String(v)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          formatter={(value) => [
            valueFormatter?.(Number(value ?? 0)) ?? String(value),
            'Total',
          ]}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={`cell-${entry.label}`} fill={BAR_COLOR} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}