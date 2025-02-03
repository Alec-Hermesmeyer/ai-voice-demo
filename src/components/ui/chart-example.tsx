"use client"

import { Line, LineChart } from "recharts"
import { ChartContainer } from "./chart"

const data = [
  {
    date: "Jan 1",
    value1: 100,
    value2: 120,
  },
  {
    date: "Jan 2",
    value1: 150,
    value2: 130,
  },
  {
    date: "Jan 3",
    value1: 120,
    value2: 140,
  },
  {
    date: "Jan 4",
    value1: 200,
    value2: 150,
  },
  {
    date: "Jan 5",
    value1: 180,
    value2: 160,
  },
]

export function ChartExample() {
  return (
    <ChartContainer
      className="w-full"
      config={{
        value1: {
          label: "Series 1",
          color: "hsl(var(--primary))",
        },
        value2: {
          label: "Series 2",
          color: "hsl(var(--secondary))",
        },
      }}
    >
      <LineChart data={data}>
        <Line type="monotone" dataKey="value1" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="value2" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

