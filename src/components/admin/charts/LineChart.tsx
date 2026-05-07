'use client'

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { formatPrice } from '@/lib/utils'

interface LineChartProps {
  data: { month: string; revenue: number; orders?: number }[]
  showOrders?: boolean
}

export function LineChart({ data, showOrders = false }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="revenue"
          tickFormatter={(v) => formatPrice(v)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        {showOrders && (
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
        )}
        <Tooltip
          formatter={(value, name) =>
            name === 'revenue'
              ? [formatPrice(Number(value ?? 0)), 'Ventas']
              : [String(value), 'Pedidos']
          }
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
            fontSize: 12,
          }}
        />
        {showOrders && <Legend formatter={(v) => (v === 'revenue' ? 'Ventas' : 'Pedidos')} />}
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          activeDot={{ r: 6 }}
        />
        {showOrders && (
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ fill: 'hsl(var(--secondary))', r: 3 }}
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
